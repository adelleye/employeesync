"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
  Row,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ItemForInventoryPage,
  LocationForInventoryPage,
} from "@/app/dashboard/(protected)/inventory/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  PlusCircle,
  MoreHorizontal,
  Edit,
  Trash2,
  PackagePlus,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

// Import server actions (adjust paths as needed)
import {
  deleteItem,
  fetchItemsPaginated,
} from "@/app/actions/inventoryActions";

// Import form components
import AddItemForm from "./AddItemForm";
import EditItemForm from "./EditItemForm";
import AdjustStockForm from "./AdjustStockForm";

interface InventoryClientPageProps {
  initialItems: ItemForInventoryPage[];
  totalItems: number;
  itemsPerPage: number;
  locations: LocationForInventoryPage[];
  companyId: string;
}

export default function InventoryClientPage({
  initialItems: serverInitialItems,
  totalItems,
  itemsPerPage,
  locations,
  companyId,
}: InventoryClientPageProps) {
  const [items, setItems] = useState<ItemForInventoryPage[]>(
    serverInitialItems.sort((a, b) => a.name.localeCompare(b.name))
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [globalFilter, setGlobalFilter] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemForInventoryPage | null>(
    null
  );
  const [adjustingStockItem, setAdjustingStockItem] =
    useState<ItemForInventoryPage | null>(null);

  // Add useEffect to update items state when serverInitialItems prop changes
  useEffect(() => {
    const sortedNewItems = [...serverInitialItems].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    setItems(sortedNewItems);
    // Reset pagination when initial items change (e.g., due to company switch)
    setCurrentPage(1);
  }, [serverInitialItems]);

  const handleLoadMore = async () => {
    if (isLoadingMore || items.length >= totalItems) return;

    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const newItems = await fetchItemsPaginated({
        companyId,
        limit: itemsPerPage,
        offset: (nextPage - 1) * itemsPerPage,
      });
      if (newItems) {
        setItems((prevItems) =>
          [...prevItems, ...newItems].sort((a, b) =>
            a.name.localeCompare(b.name)
          )
        );
        setCurrentPage(nextPage);
      }
    } catch (error) {
      console.error("Failed to load more items:", error);
      toast.error("Failed to load more items.");
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Memoize callback for AddItemForm
  const handleAddItemSuccess = useCallback((newItem: ItemForInventoryPage) => {
    setItems((prev) =>
      [newItem, ...prev].sort((a, b) => a.name.localeCompare(b.name))
    );
    setIsAddModalOpen(false);
  }, []);

  const handleAddItemCancel = useCallback(() => {
    setIsAddModalOpen(false);
  }, []);

  // Memoize callback for EditItemForm
  const handleEditItemSuccess = useCallback(
    (updatedItem: ItemForInventoryPage) => {
      setItems((prev) =>
        prev
          .map((item) => (item.id === updatedItem.id ? updatedItem : item))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      setEditingItem(null);
    },
    []
  );

  const handleEditItemCancel = useCallback(() => {
    setEditingItem(null);
  }, []);

  // Memoize callback for AdjustStockForm
  const handleAdjustStockSuccess = useCallback(
    (updatedItem: ItemForInventoryPage) => {
      setItems((prev) =>
        prev
          .map((item) => (item.id === updatedItem.id ? updatedItem : item))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      setAdjustingStockItem(null);
    },
    []
  ); // Dependencies: setItems, setAdjustingStockItem

  const handleAdjustStockCancel = useCallback(() => {
    setAdjustingStockItem(null);
  }, []); // Dependencies: setAdjustingStockItem

  const columns = useMemo<ColumnDef<ItemForInventoryPage>[]>(
    () => [
      { accessorKey: "name", header: "Name", cell: (info) => info.getValue() },
      {
        accessorKey: "sku",
        header: "SKU",
        cell: (info) => info.getValue() || "-",
      },
      {
        accessorKey: "qtyOnHand",
        header: "Qty on Hand",
        cell: (info) => info.getValue(),
      },
      {
        accessorKey: "reorderPoint",
        header: "Reorder Point",
        cell: (info) => info.getValue() ?? "-",
      },
      {
        accessorKey: "locationName",
        header: "Location",
        cell: ({ row }) => row.original.locationName || "N/A",
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const item = row.original;
          return (
            <Dialog>
              {" "}
              {/* Consider Popover for less intrusive action menu */}
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-xs">
                <DialogHeader>
                  <DialogTitle>{item.name}</DialogTitle>
                  <DialogDescription>
                    Actions for {item.name}.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col space-y-1 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="justify-start w-full"
                    onClick={() => setEditingItem(item)}
                  >
                    <Edit className="mr-2 h-4 w-4" /> Edit Item
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="justify-start w-full"
                    onClick={() => setAdjustingStockItem(item)}
                  >
                    <PackagePlus className="mr-2 h-4 w-4" /> Adjust Stock
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="justify-start w-full"
                    onClick={async () => {
                      if (
                        confirm("Are you sure you want to delete this item?")
                      ) {
                        const result = await deleteItem(item.id);
                        if (result.status === "success") {
                          toast.success(result.message);
                          setItems((prev) =>
                            prev.filter((i) => i.id !== item.id)
                          );
                        } else {
                          toast.error(
                            result.message || "Failed to delete item."
                          );
                        }
                      }
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Item
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          );
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: items,
    columns,
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const { rows } = table.getRowModel();
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    estimateSize: () => 52, // Adjusted for typical row height with padding
    getScrollElement: () => tableContainerRef.current,
    overscan: 5,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0]?.start ?? 0 : 0;
  const paddingBottom =
    virtualItems.length > 0
      ? rowVirtualizer.getTotalSize() -
        (virtualItems[virtualItems.length - 1]?.end ?? 0)
      : 0;

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Item
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Inventory Item</DialogTitle>
              <DialogDescription>
                Fill in the details below to add a new item to your inventory.
              </DialogDescription>
            </DialogHeader>
            <AddItemForm
              companyId={companyId}
              locations={locations}
              onSuccess={handleAddItemSuccess}
              onCancel={handleAddItemCancel}
            />
          </DialogContent>
        </Dialog>
      </div>

      {editingItem && (
        <Dialog
          open={!!editingItem}
          onOpenChange={(isOpen) => !isOpen && setEditingItem(null)}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit: {editingItem.name}</DialogTitle>
              <DialogDescription>
                Update the details for {editingItem.name}.
              </DialogDescription>
            </DialogHeader>
            <EditItemForm
              item={editingItem}
              locations={locations}
              onSuccess={handleEditItemSuccess}
              onCancel={handleEditItemCancel}
            />
          </DialogContent>
        </Dialog>
      )}

      {adjustingStockItem && (
        <Dialog
          open={!!adjustingStockItem}
          onOpenChange={(isOpen) => !isOpen && setAdjustingStockItem(null)}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Adjust Stock: {adjustingStockItem.name}</DialogTitle>
              <DialogDescription>
                Current quantity: {adjustingStockItem.qtyOnHand}. Enter the
                adjustment amount.
              </DialogDescription>
            </DialogHeader>
            <AdjustStockForm
              item={adjustingStockItem}
              onSuccess={handleAdjustStockSuccess}
              onCancel={handleAdjustStockCancel}
            />
          </DialogContent>
        </Dialog>
      )}

      <Input
        placeholder="Search all items..."
        value={globalFilter ?? ""}
        onChange={(event) => setGlobalFilter(String(event.target.value))}
        className="max-w-sm"
      />

      <div
        ref={tableContainerRef}
        className="rounded-md border overflow-auto h-[600px]"
      >
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    style={{
                      width:
                        header.getSize() !== 150 ? header.getSize() : undefined,
                    }} // Default Tanstack size is 150
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white divide-y divide-gray-200 relative">
            {paddingTop > 0 && (
              <tr>
                <td style={{ height: `${paddingTop}px` }} />
              </tr>
            )}
            {virtualItems.map((virtualRow) => {
              const row = rows[virtualRow.index] as Row<ItemForInventoryPage>;
              return (
                <tr key={row.id} className="hover:bg-gray-50 w-full">
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-700"
                      style={{
                        width:
                          cell.column.getSize() !== 150
                            ? cell.column.getSize()
                            : undefined,
                      }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
            {paddingBottom > 0 && (
              <tr>
                <td style={{ height: `${paddingBottom}px` }} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
