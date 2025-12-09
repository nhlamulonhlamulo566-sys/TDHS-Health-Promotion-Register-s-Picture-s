

'use client';

import React, { useState, useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { User, Department } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/context/app-context';
import { MoreHorizontal, PlusCircle, ShieldCheck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';


type NewUser = Omit<User, 'id' | 'status'> & { password?: string, confirmPassword?: string };

export default function SettingsPage() {
  const { addUser, deleteUser, currentUser, departments } = useAppContext();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  
  const [newUser, setNewUser] = useState<NewUser>({ name: '', email: '', persalNumber: '', role: "Sub - District 1A User's Controller", departmentId: '', password: '', confirmPassword: '' });

  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'users'), where('status', '==', 'Active'));
  }, [firestore]);
  const { data: usersData } = useCollection<User>(usersQuery);
  const users = useMemo(() => usersData || [], [usersData]);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const canManageUsers = currentUser?.role === 'Administrator';

  const getDepartmentName = (departmentId?: string) => {
    if (!departmentId) return 'N/A';
    return departments.find(d => d.id === departmentId)?.name || 'Unknown';
  };

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.persalNumber || !newUser.role || !newUser.password) {
        toast({
            title: "Error",
            description: "Please fill in all required fields.",
            variant: "destructive",
        });
        return;
    }
    if (newUser.password !== newUser.confirmPassword) {
      toast({
          title: "Error",
          description: "Passwords do not match.",
          variant: "destructive",
      });
      return;
    }
    if (!/^\d{8}$/.test(newUser.persalNumber)) {
        toast({
            title: "Invalid Persal Number",
            description: "Persal number must be exactly 8 digits.",
            variant: "destructive",
        });
        return;
    }
    
    try {
      await addUser({
          name: newUser.name,
          email: newUser.email,
          persalNumber: newUser.persalNumber,
          role: newUser.role,
          departmentId: newUser.departmentId,
      }, newUser.password);

      toast({
          title: "User Added",
          description: `${newUser.name} has been added to the system.`
      });
      
      setNewUser({ name: '', email: '', persalNumber: '', role: "Sub - District 1A User's Controller", departmentId: '', password: '', confirmPassword: '' });
      setIsAddUserOpen(false);
    } catch (error: any) {
        toast({
            title: "Error creating user",
            description: error.message,
            variant: "destructive",
        });
    }
  };

  const handleDeleteClick = (user: User) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!selectedUser) return;
    // We only "soft delete" by changing the status. A backend function is needed for full deletion.
    deleteUser(selectedUser.id);
    toast({
        title: "User Deactivated",
        description: `${selectedUser.name}'s account has been deactivated.`,
    });
    setIsDeleteDialogOpen(false);
    setSelectedUser(null);
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold tracking-tight font-headline">Settings</h1>
            <p className="text-muted-foreground">Manage application settings and user access.</p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
           <CardDescription>
            {canManageUsers
              ? "Add, view, and remove users from the system."
              : "User management is restricted to administrators."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            {canManageUsers ? (
                <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                    <DialogTrigger asChild>
                        <Button>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add User
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                        <DialogTitle>Add New User</DialogTitle>
                        <DialogDescription>Fill in the details for the new user.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="user-name" className="text-right">Name</Label>
                                <Input 
                                    id="user-name" 
                                    value={newUser.name} 
                                    onChange={(e) => setNewUser({...newUser, name: e.target.value})} 
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="user-email" className="text-right">Email</Label>
                                <Input 
                                    id="user-email" 
                                    type="email"
                                    value={newUser.email} 
                                    onChange={(e) => setNewUser({...newUser, email: e.target.value})} 
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="persal-number" className="text-right">Persal No.</Label>
                                <Input 
                                    id="persal-number" 
                                    value={newUser.persalNumber} 
                                    onChange={(e) => setNewUser({...newUser, persalNumber: e.target.value})} 
                                    className="col-span-3"
                                    maxLength={8}
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="user-password" className="text-right">Password</Label>
                                <Input 
                                    id="user-password"
                                    type="password"
                                    value={newUser.password} 
                                    onChange={(e) => setNewUser({...newUser, password: e.target.value})} 
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="user-confirm-password" className="text-right">Confirm</Label>
                                <Input 
                                    id="user-confirm-password"
                                    type="password"
                                    value={newUser.confirmPassword} 
                                    onChange={(e) => setNewUser({...newUser, confirmPassword: e.target.value})} 
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="user-dept" className="text-right">Department</Label>
                                <Select value={newUser.departmentId} onValueChange={(val) => setNewUser({...newUser, departmentId: val})}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select a department" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {departments.map(dept => (
                                            <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="user-role" className="text-right">Role</Label>
                                <Select value={newUser.role} onValueChange={(val: User['role']) => setNewUser({...newUser, role: val})}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select a role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Administrator">Administrator</SelectItem>
                                        <SelectItem value="Sub - District 1A User's Controller">Sub - District 1A User's Controller</SelectItem>
                                        <SelectItem value="Sub - District 1B User's Controller">Sub - District 1B User's Controller</SelectItem>
                                        <SelectItem value="Sub - District 2 User's Controller">Sub - District 2 User's Controller</SelectItem>
                                        <SelectItem value="Sub - District 3 &amp; 4 User's Controller">Sub - District 3 &amp; 4 User's Controller</SelectItem>
                                        <SelectItem value="Sub - District 5 &amp; 6 User's Controller">Sub - District 5 &amp; 6 User's Controller</SelectItem>
                                        <SelectItem value="Sub - District 7 User's Controller">Sub - District 7 User's Controller</SelectItem>
                                        <SelectItem value="Health Promoter">Health Promoter</SelectItem>
                                        <SelectItem value="TDHS">TDHS</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button onClick={handleAddUser}>Create User</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            ) : (
                <div className="flex items-center p-4 rounded-md bg-muted text-muted-foreground">
                    <ShieldCheck className="h-5 w-5 mr-3" />
                    <p className="text-sm">Only users with the 'Administrator' role can add new users.</p>
                </div>
            )}

            {canManageUsers && (
              <Card>
                <CardHeader>
                  <CardTitle>All Users</CardTitle>
                  <CardDescription>A list of all active users in the system.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Persal No.</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Role</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.length > 0 ? (
                        users.map((user) => (
                            user.id !== currentUser?.id && ( // Prevent admin from deleting themselves
                                <TableRow key={user.id}>
                                    <TableCell className="font-medium">{user.name}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>{user.persalNumber}</TableCell>
                                    <TableCell>{getDepartmentName(user.departmentId)}</TableCell>
                                    <TableCell>{user.role}</TableCell>
                                </TableRow>
                            )
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center">
                            No users found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
        </CardContent>
      </Card>
       <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently deactivate the user "{selectedUser?.name}". Their account will no longer be accessible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">
              Deactivate User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
