/**
 * BranchSelector
 * Allows selecting a branch for a client in the Foreign Workers module.
 * Shows a dropdown of branches and a button to manage branches.
 */

import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, Building2 } from 'lucide-react';
import { BranchService } from '@/services/branch.service';
import type { BranchWithDisplayName } from '@/types/branch.types';
import { BranchManagementDialog } from './BranchManagementDialog';

interface BranchSelectorProps {
  /** The client ID to load branches for */
  clientId: string | null;
  /** Currently selected branch ID */
  value: string | null;
  /** Callback when branch selection changes - includes branch name, isDefault flag, and isSingleBranch flag */
  onChange: (branchId: string | null, clientId: string | null, branchName: string | null, isDefault: boolean, isSingleBranch: boolean) => void;
  /** Whether to show the management button */
  showManagement?: boolean;
  /** Disabled state */
  disabled?: boolean;
}

export function BranchSelector({
  clientId,
  value,
  onChange,
  showManagement = true,
  disabled = false,
}: BranchSelectorProps) {
  const [branches, setBranches] = useState<BranchWithDisplayName[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isManagementOpen, setIsManagementOpen] = useState(false);

  // Load branches when clientId changes
  useEffect(() => {
    const loadBranches = async () => {
      if (!clientId) {
        setBranches([]);
        return;
      }

      setIsLoading(true);
      try {
        let branchList = await BranchService.getClientBranches(clientId);

        // If no branches exist, create a default one automatically
        if (branchList.length === 0) {
                    const defaultBranchId = await BranchService.getOrCreateDefaultBranch(clientId);
          
          if (defaultBranchId) {
            // Reload branches to get the newly created one with full details
            branchList = await BranchService.getClientBranches(clientId);
          }
        }

        setBranches(branchList);

        // If no branch selected and there's a default, select it
        if (!value && branchList.length > 0) {
          const defaultBranch = branchList.find(b => b.is_default) || branchList[0];
          onChange(defaultBranch.id, clientId, defaultBranch.name, defaultBranch.is_default, branchList.length === 1);
        }
      } catch (error) {
        console.error('Error loading branches:', error);
        setBranches([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadBranches();
  }, [clientId]);

  // Handle branch selection
  const handleSelect = (branchId: string) => {
    const branch = branches.find(b => b.id === branchId);
    onChange(branchId, clientId, branch?.name || null, branch?.is_default || false, branches.length === 1);
  };

  // Handle branches update from management dialog
  const handleBranchesUpdated = async () => {
    if (!clientId) return;

    const branchList = await BranchService.getClientBranches(clientId);
    setBranches(branchList);

    // If current selection is no longer valid, select default
    if (value && !branchList.find(b => b.id === value)) {
      const defaultBranch = branchList.find(b => b.is_default) || branchList[0];
      if (defaultBranch) {
        onChange(defaultBranch.id, clientId, defaultBranch.name, defaultBranch.is_default, branchList.length === 1);
      }
    }
  };

  // Don't show if no client selected
  if (!clientId) {
    return null;
  }

  // Don't show selector if only one branch exists
  if (branches.length <= 1 && !showManagement) {
    return null;
  }

  return (
    <div className="flex items-center gap-2" dir="rtl">
      {branches.length > 1 && (
        <Select
          value={value || undefined}
          onValueChange={handleSelect}
          disabled={disabled || isLoading}
        >
          <SelectTrigger className="w-[280px] text-right">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent dir="rtl" align="end">
            {branches.map((branch) => (
              <SelectItem key={branch.id} value={branch.id} className="text-right">
                <div className="flex items-center gap-2">
                  <span>{branch.name}</span>
                  {branch.is_default && (
                    <Badge variant="secondary" className="text-xs">
                      ראשי
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {branches.length === 1 && (
        <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
          <Building2 className="h-4 w-4" />
          <span>{branches[0].name}</span>
          {branches[0].is_default && (
            <Badge variant="secondary" className="text-xs">
              ראשי
            </Badge>
          )}
        </div>
      )}

      {showManagement && (
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsManagementOpen(true)}
          disabled={disabled}
          title="ניהול סניפים"
        >
          <Settings className="h-4 w-4" />
        </Button>
      )}

      {isManagementOpen && (
        <BranchManagementDialog
          clientId={clientId}
          isOpen={isManagementOpen}
          onClose={() => setIsManagementOpen(false)}
          onBranchesUpdated={handleBranchesUpdated}
        />
      )}
    </div>
  );
}
