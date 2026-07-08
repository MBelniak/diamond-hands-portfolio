"use client";

import { Button } from "@/components/ui/button";
import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from "lucide-react";
import React from "react";

export interface PaginationProps {
  currentPage: number;
  pageCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ currentPage, pageCount, pageSize, onPageChange }) => {
  return (
    <div className="flex items-center justify-between p-2">
      <div className="flex items-center space-x-2">
        <Button
          className="px-2 py-1 border rounded disabled:opacity-50"
          onClick={() => onPageChange(0)}
          disabled={pageCount === 0 || currentPage === 0}
          aria-label="First page"
          variant={"secondary"}
        >
          <ChevronFirst />
        </Button>
        <Button
          className="px-2 py-1 border rounded disabled:opacity-50"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 0}
          aria-label="Previous page"
          variant={"secondary"}
        >
          <ChevronLeft />
        </Button>
        <Button
          className="px-2 py-1 border rounded disabled:opacity-50"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= pageCount - 1}
          aria-label="Next page"
          variant={"secondary"}
        >
          <ChevronRight />
        </Button>
        <Button
          className="px-2 py-1 border rounded disabled:opacity-50"
          onClick={() => onPageChange(pageCount - 1)}
          disabled={pageCount === 0 || currentPage >= pageCount - 1}
          aria-label="Last page"
          variant={"secondary"}
        >
          <ChevronLast />
        </Button>
      </div>

      <div className="text-sm">
        Page {currentPage + 1} of {Math.max(1, pageCount)} • Showing up to {pageSize} rows per page
      </div>
    </div>
  );
};
