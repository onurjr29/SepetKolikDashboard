"use client"

import { useRef, useState, useEffect } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { ArrowUpDown } from "lucide-react"

interface VirtualizedTableProps<T extends Record<string, any>> {
  data: T[]
  columns: string[]
  selectedRows: Set<number>
  toggleRow: (index: number) => void
  toggleAll: () => void
  allSelected: boolean
  sortBy: string | null
  sortOrder: "asc" | "desc"
  handleSort: (column: string) => void
  pageSize: number
  currentPage: number
}

export function VirtualizedTable<T extends Record<string, any>>({
  data,
  columns,
  selectedRows,
  toggleRow,
  toggleAll,
  allSelected,
  sortBy,
  sortOrder,
  handleSort,
  pageSize,
  currentPage,
}: VirtualizedTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null)
  const [parentHeight, setParentHeight] = useState(500)

  // Update parent height on resize
  useEffect(() => {
    if (!parentRef.current) return

    const updateHeight = () => {
      const availableHeight = window.innerHeight - parentRef.current!.getBoundingClientRect().top - 100
      setParentHeight(Math.max(400, availableHeight))
    }

    updateHeight()
    window.addEventListener("resize", updateHeight)
    return () => window.removeEventListener("resize", updateHeight)
  }, [])

  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 45, // Approximate row height
    overscan: 10,
  })

  return (
    <div ref={parentRef} className="border rounded-md overflow-auto" style={{ height: parentHeight }}>
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-background">
          <TableRow style={{ display: "flex", width: "100%" }}>
            <TableHead className="sticky left-0 z-20 bg-background flex-shrink-0" style={{ width: "50px" }}>
              <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all rows" />
            </TableHead>
            {columns.map((col) => (
              <TableHead key={col} className="flex-1" style={{ minWidth: "150px" }}>
                <Button
                  variant="ghost"
                  className="p-0 font-medium flex items-center gap-1 hover:bg-transparent"
                  onClick={() => handleSort(col)}
                >
                  {col}
                  <ArrowUpDown className={`h-4 w-4 ${sortBy === col ? "text-foreground" : "text-muted-foreground"}`} />
                </Button>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          <tr style={{ height: `${rowVirtualizer.getTotalSize()}px`, display: "block" }}>
            <td colSpan={columns.length + 1} style={{ display: "block", padding: 0 }}>
              <div style={{ position: "relative", width: "100%" }}>
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const row = data[virtualRow.index]
                  const rowIndex = (currentPage - 1) * pageSize + virtualRow.index

                  return (
                    <TableRow
                      key={virtualRow.index}
                      className="hover:bg-muted/50 absolute w-full"
                      style={{
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                        display: "flex",
                        width: "100%",
                      }}
                    >
                      <TableCell className="sticky left-0 z-10 bg-background flex-shrink-0" style={{ width: "50px" }}>
                        <Checkbox
                          checked={selectedRows.has(rowIndex)}
                          onCheckedChange={() => toggleRow(virtualRow.index)}
                          aria-label={`Select row ${virtualRow.index + 1}`}
                        />
                      </TableCell>
                      {columns.map((col) => (
                        <TableCell key={col} className="truncate flex-1" style={{ minWidth: "150px" }}>
                          {row[col] !== undefined ? String(row[col]) : ""}
                        </TableCell>
                      ))}
                    </TableRow>
                  )
                })}
              </div>
            </td>
          </tr>
        </TableBody>
      </Table>
    </div>
  )
}
