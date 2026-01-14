/**
 * Distribution Lists Page - Manage mailing distribution lists
 * Clean, professional interface for Israeli accounting CRM
 */

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Users, Mail, Plus, MoreVertical, Edit, Trash2, Loader2, ListFilter } from 'lucide-react';
import { useBroadcastStore } from '../store/broadcastStore';
import { CreateListDialog } from '../components/lists/CreateListDialog';
import { EditListDialog } from '../components/lists/EditListDialog';
import type { DistributionList } from '../types/broadcast.types';

export const BroadcastPage: React.FC = () => {
  const { lists, listsLoading, fetchLists, fetchAllActiveClients, deleteList } = useBroadcastStore();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedList, setSelectedList] = useState<DistributionList | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [listToDelete, setListToDelete] = useState<DistributionList | null>(null);

  useEffect(() => {
    fetchLists();
    fetchAllActiveClients();
  }, [fetchLists, fetchAllActiveClients]);

  const handleEdit = (list: DistributionList) => {
    setSelectedList(list);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (list: DistributionList) => {
    setListToDelete(list);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (listToDelete) {
      await deleteList(listToDelete.id);
      setDeleteDialogOpen(false);
      setListToDelete(null);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)]">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <ListFilter className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">רשימות תפוצה</h1>
              <p className="text-muted-foreground">
                ניהול רשימות תפוצה לשליחת מכתבים לקבוצות לקוחות
              </p>
            </div>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)} size="lg">
            <Plus className="h-5 w-5 ml-2" />
            רשימה חדשה
          </Button>
        </div>
      </div>

      {/* Content */}
      {listsLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : lists.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mt-6 text-lg font-semibold">אין רשימות תפוצה</h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
                צור רשימות תפוצה כדי לשלוח מכתבים לקבוצות לקוחות מסוימות.
                לאחר יצירת הרשימות, תוכל לבחור אותן בשליחת מכתבים.
              </p>
              <Button className="mt-6" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 ml-2" />
                צור רשימה ראשונה
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {lists.map((list) => (
            <Card
              key={list.id}
              className="group relative overflow-hidden transition-all hover:shadow-md hover:border-primary/30"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1 min-w-0">
                    <CardTitle className="text-lg font-semibold truncate">
                      {list.name}
                    </CardTitle>
                    {list.description && (
                      <CardDescription className="line-clamp-2">
                        {list.description}
                      </CardDescription>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(list)}>
                        <Edit className="h-4 w-4 ml-2" />
                        עריכה
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteClick(list)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 ml-2" />
                        מחיקה
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950">
                      <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <div className="font-semibold">{list.member_count}</div>
                      <div className="text-xs text-muted-foreground">לקוחות</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950">
                      <Mail className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <div className="font-semibold">{list.email_count}</div>
                      <div className="text-xs text-muted-foreground">מיילים</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <CreateListDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      {selectedList && (
        <EditListDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          list={selectedList}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת רשימה</AlertDialogTitle>
            <AlertDialogDescription>
              האם למחוק את הרשימה "{listToDelete?.name}"?
              <br />
              פעולה זו לא ניתנת לביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BroadcastPage;
