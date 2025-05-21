"use client"

import type React from "react"

import { useState, useMemo, useEffect, useCallback } from "react"
import Papa from "papaparse"
import { Filter, Search, Send, Upload, X, ChevronLeft, ChevronRight } from "lucide-react"
import { sendToTelegramWithImage } from "@/lib/sendToTelegram"
import type { ProductRow } from "@/lib/sendToTelegram"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { useDebounce } from "@/hooks/use-debounce"
import { VirtualizedTable } from "@/components/virtualized-table"

const BOT_TOKEN = "7659638825:AAE52raciZuF5b1OUDbbLZ1mEXxRDzenEHU"
const CHAT_ID = "-1002588101602"

type CSVRow = Record<string, string>
interface FilterType {
  column: string
  values: Set<string>
}

export default function CSVDashboardOptimized() {
  const { toast } = useToast()
  const [data, setData] = useState<CSVRow[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [filterColumn, setFilterColumn] = useState("")
  const [filterOptions, setFilterOptions] = useState<string[]>([])
  const [selectedValues, setSelectedValues] = useState<Set<string>>(new Set())
  const [filters, setFilters] = useState<FilterType[]>([])
  const [sortBy, setSortBy] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const pageSize = 200 // Increased for better performance

  // Debounce search for performance
  const debouncedSearch = useDebounce(debouncedSearchQuery, 300)

  useEffect(() => {
    setSearchQuery(debouncedSearch)
  }, [debouncedSearch])

  // Handle CSV import with chunked processing
  const uploadCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    setData([]) // Clear existing data
    setColumns([])
    setFilters([])
    setSelectedRows(new Set())
    setFilterColumn("")
    setFilterOptions([])
    setSelectedValues(new Set())
    setPage(1)

    Papa.parse<CSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      worker: true, // Use a worker thread
      chunk: (results, parser) => {
        // Process data in chunks
        setData((prev) => [...prev, ...results.data])
        if (!columns.length && results.meta.fields) {
          setColumns(results.meta.fields)
        }
      },
      complete: (results) => {
        setIsLoading(false)
        toast({
          title: "CSV Loaded Successfully",
          description: `Loaded ${results.data.length} rows`,
        })
      },
      error: (error) => {
        setIsLoading(false)
        toast({
          title: "Error Loading CSV",
          description: error.message,
          variant: "destructive",
        })
      },
    })
  }

  // Get filtered data based on current filters (excluding the column we're currently filtering)
  const getFilteredDataForOptions = useCallback(
    (currentFilterColumn: string) => {
      // If no filters, return all data
      if (filters.length === 0) return data

      return data.filter((row) => {
        // Check all filters except for the one on the current column
        for (const f of filters) {
          // Skip if this is the column we're currently filtering on
          if (f.column === currentFilterColumn) continue

          const value = row[f.column]
          if (value === undefined || value === null) return false
          if (!f.values.has(String(value))) return false
        }
        return true
      })
    },
    [data, filters],
  )

  // Setup filter options - updated to consider current filters
  const onSelectColumn = useCallback(
    (col: string) => {
      setFilterColumn(col)

      // Only compute unique values for the selected column
      if (!col) {
        setFilterOptions([])
        return
      }

      // Get data filtered by all other current filters
      const filteredData = getFilteredDataForOptions(col)

      // Use a Set for faster unique value collection
      const uniqueValues = new Set<string>()

      // Process in batches for better performance
      const batchSize = 1000
      let index = 0

      const processNextBatch = () => {
        const end = Math.min(index + batchSize, filteredData.length)

        for (let i = index; i < end; i++) {
          const value = filteredData[i][col]
          if (value !== undefined && value !== null && value !== "") {
            // Convert to string to ensure compatibility
            uniqueValues.add(String(value))
          }
        }

        index = end

        if (index < filteredData.length) {
          // Process next batch asynchronously
          setTimeout(processNextBatch, 0)
        } else {
          // All batches processed
          setFilterOptions(Array.from(uniqueValues))
        }
      }

      processNextBatch()
      setSelectedValues(new Set())
    },
    [data, filters, getFilteredDataForOptions],
  )

  // Add filter
  const addFilter = useCallback(() => {
    if (!filterColumn || selectedValues.size === 0) return
    setFilters((prev) => [...prev, { column: filterColumn, values: new Set(selectedValues) }])
    setFilterColumn("")
    setFilterOptions([])
    setSelectedValues(new Set())
    setPage(1)
  }, [filterColumn, selectedValues])

  // Remove filter
  const removeFilter = useCallback((idx: number) => {
    setFilters((prev) => prev.filter((_, i) => i !== idx))
    setFilterColumn("")
    setFilterOptions([])
    setSelectedValues(new Set())
    setPage(1)
  }, [])

  // Sort handler
  const handleSort = useCallback(
    (col: string) => {
      setSortOrder((prev) => (sortBy === col && prev === "asc" ? "desc" : "asc"))
      setSortBy(col)
    },
    [sortBy],
  )

  // Filter & search - optimized with memoization
  const filtered = useMemo(() => {
    if (!searchQuery && filters.length === 0) return data

    return data.filter((row) => {
      // Only perform search if there's a query
      if (searchQuery) {
        const matchSearch = Object.entries(row).some(([key, val]) => {
          if (val === undefined || val === null) return false
          return String(val).toLowerCase().includes(searchQuery.toLowerCase())
        })
        if (!matchSearch) return false
      }

      // Only check filters if there are any
      if (filters.length > 0) {
        for (const f of filters) {
          const value = row[f.column]
          if (value === undefined || value === null) return false
          if (!f.values.has(String(value))) return false
        }
      }

      return true
    })
  }, [data, searchQuery, filters])

  // Reset page when filtered data changes
  useEffect(() => setPage(1), [filtered.length])

  // Sort - optimized
  const sorted = useMemo(() => {
    if (!sortBy) return filtered

    // Create a new array only when needed
    return [...filtered].sort((a, b) => {
      const A = a[sortBy] !== undefined ? String(a[sortBy]) : ""
      const B = b[sortBy] !== undefined ? String(b[sortBy]) : ""

      // Try to parse as numbers if possible
      const numA = Number.parseFloat(A)
      const numB = Number.parseFloat(B)

      // Fast path for numeric comparison
      if (!isNaN(numA) && !isNaN(numB)) {
        return sortOrder === "asc" ? numA - numB : numB - numA
      }

      // String comparison
      return sortOrder === "asc" ? A.localeCompare(B) : B.localeCompare(A)
    })
  }, [filtered, sortBy, sortOrder])

  // Pagination
  const total = sorted.length
  const pages = Math.ceil(total / pageSize) || 1
  const view = useMemo(() => {
    const start = (page - 1) * pageSize
    return sorted.slice(start, start + pageSize)
  }, [sorted, page, pageSize])

  // Selecting
  const allOnPage = view.length > 0 && view.every((_, i) => selectedRows.has((page - 1) * pageSize + i))
  const someSelected = selectedRows.size > 0

  const toggleAll = useCallback(() => {
    const base = (page - 1) * pageSize
    setSelectedRows((prev) => {
      const next = new Set(prev)
      if (allOnPage) {
        // Deselect all on current page
        view.forEach((_, i) => {
          next.delete(base + i)
        })
      } else {
        // Select all on current page
        view.forEach((_, i) => {
          next.add(base + i)
        })
      }
      return next
    })
  }, [view, page, pageSize, allOnPage])

  const toggleOne = useCallback(
    (i: number) => {
      const idx = (page - 1) * pageSize + i
      setSelectedRows((prev) => {
        const next = new Set(prev)
        next.has(idx) ? next.delete(idx) : next.add(idx)
        return next
      })
    },
    [page, pageSize],
  )

  // Send to Telegram
  const sendTelegram = async () => {
    if (selectedRows.size === 0) {
      toast({
        title: "No Rows Selected",
        description: "Please select at least one row to send",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const sel = Array.from(selectedRows).map((i) => sorted[i])
      const msg: ProductRow[] = sel.map(r => ({
        name:             r["Name"]               ?? "",
        brand:            r["Brand"]              ?? "",
        original_price:   r["Original Price"]     ?? "",
        discounted_price: r["Discounted Price"]   ?? "",
        discount_percent: r["Discount Ratio (%)"] ?? "",
        rating:           r["Total Ratings"]     ?? "",
        image_url:        r["First Image URL"]    ?? "",  // burayı güncelledik
        url:              r["Product URL"]        ?? "",  // ve burayı
        kategori:         r["Kategori"]           ?? "",
      }));
      
      await sendToTelegramWithImage(msg, BOT_TOKEN, CHAT_ID)

      toast({
        title: "Sent Successfully",
        description: `Sent ${sel.length} items to Telegram`,
      })
    } catch (error) {
      toast({
        title: "Error Sending to Telegram",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full shadow-lg border-0">
      <CardHeader className="pb-3 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-2xl font-bold">CSV Dashboard</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild className="relative">
              <label>
                <Upload className="h-4 w-4 mr-2" />
                Upload CSV
                <Input
                  type="file"
                  accept=".csv"
                  onChange={uploadCSV}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </label>
            </Button>
            <Button
              onClick={sendTelegram}
              disabled={!someSelected || isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Send className="h-4 w-4 mr-2" />
              Send to Telegram
              {selectedRows.size > 0 && (
                <Badge variant="outline" className="ml-2 bg-blue-700">
                  {selectedRows.size}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {/* Search and Filter Controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search across all columns..."
              value={debouncedSearchQuery}
              onChange={(e) => setDebouncedSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={filterColumn} onValueChange={onSelectColumn}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select column" />
              </SelectTrigger>
              <SelectContent>
                {columns.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {filterOptions.length > 0 && (
              <div className="flex-1 min-w-[200px]">
                <ScrollArea className="h-32 border rounded-md">
                  <div className="p-2">
                    {filterOptions.map((opt) => (
                      <div key={opt} className="flex items-center space-x-2 py-1">
                        <Checkbox
                          id={`filter-${opt}`}
                          checked={selectedValues.has(opt)}
                          onCheckedChange={(checked) => {
                            setSelectedValues((prev) => {
                              const next = new Set(prev)
                              checked ? next.add(opt) : next.delete(opt)
                              return next
                            })
                          }}
                        />
                        <label htmlFor={`filter-${opt}`} className="text-sm cursor-pointer">
                          {opt}
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            <Button
              onClick={addFilter}
              disabled={!filterColumn || selectedValues.size === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              <Filter className="h-4 w-4 mr-2" />
              Add Filter
            </Button>
          </div>
        </div>

        {/* Active Filters */}
        {filters.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {filters.map((f, i) => (
              <Badge key={i} variant="secondary" className="flex items-center gap-1 px-3 py-1.5">
                <span className="font-semibold">{f.column}:</span> {Array.from(f.values).join(", ")}
                <Button variant="ghost" size="icon" className="h-4 w-4 ml-1 p-0" onClick={() => removeFilter(i)}>
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        )}

        {/* Data Stats */}
        {data.length > 0 && (
          <div className="text-sm text-muted-foreground mb-4">
            Showing {view.length} of {total} rows
            {selectedRows.size > 0 && ` (${selectedRows.size} selected)`}
          </div>
        )}

        {/* Virtualized Table */}
        {data.length > 0 ? (
          <VirtualizedTable
            data={view}
            columns={columns}
            selectedRows={selectedRows}
            toggleRow={toggleOne}
            toggleAll={toggleAll}
            allSelected={allOnPage}
            sortBy={sortBy}
            sortOrder={sortOrder}
            handleSort={handleSort}
            pageSize={pageSize}
            currentPage={page}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-3 mb-4">
              <Upload className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">No CSV Data Loaded</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">Upload a CSV file to get started</p>
            <Button variant="outline" asChild>
              <label className="cursor-pointer">
                Upload CSV
                <Input type="file" accept=".csv" onChange={uploadCSV} className="hidden" />
              </label>
            </Button>
          </div>
        )}

        {/* Pagination */}
        {data.length > 0 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Page {page} of {pages}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1 || isLoading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage((p) => Math.min(p + 1, pages))}
                disabled={page === pages || isLoading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

