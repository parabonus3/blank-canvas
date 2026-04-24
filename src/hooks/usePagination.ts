import { useState, useEffect, useMemo, useRef } from "react";

export interface UsePaginationReturn<T> {
  paginatedItems: T[];
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
}

export function usePagination<T>(items: T[], defaultPageSize: number): UsePaginationReturn<T> {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const prevLengthRef = useRef(items.length);

  // Reset to page 1 when items change (filters altered)
  useEffect(() => {
    if (prevLengthRef.current !== items.length) {
      setCurrentPage(1);
      prevLengthRef.current = items.length;
    }
  }, [items.length]);

  // Reset to page 1 when pageSize changes
  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  // Clamp current page
  const safePage = Math.min(currentPage, totalPages);

  const paginatedItems = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize]
  );

  return {
    paginatedItems,
    currentPage: safePage,
    totalPages,
    pageSize,
    totalItems: items.length,
    setCurrentPage,
    setPageSize,
  };
}
