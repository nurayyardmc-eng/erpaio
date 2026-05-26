import { describe, it, expect } from "vitest";
import { computePagination } from "./pagination";

describe("lib/pagination/computePagination", () => {
  it("100 items, 20 per page, page 1 → 1–20 of 100, 5 pages", () => {
    const r = computePagination(1, 20, 100);
    expect(r.totalPages).toBe(5);
    expect(r.start).toBe(1);
    expect(r.end).toBe(20);
    expect(r.isFirst).toBe(true);
    expect(r.isLast).toBe(false);
  });

  it("100 items, 20 per page, page 5 → 81–100, isLast", () => {
    const r = computePagination(5, 20, 100);
    expect(r.start).toBe(81);
    expect(r.end).toBe(100);
    expect(r.isLast).toBe(true);
    expect(r.isFirst).toBe(false);
  });

  it("17 items, 5 per page → 4 pages, last page 16–17", () => {
    const r = computePagination(4, 5, 17);
    expect(r.totalPages).toBe(4);
    expect(r.start).toBe(16);
    expect(r.end).toBe(17);
  });

  it("zero items → 1 page, start/end = 0", () => {
    const r = computePagination(1, 20, 0);
    expect(r.totalPages).toBe(1);
    expect(r.start).toBe(0);
    expect(r.end).toBe(0);
    expect(r.isFirst).toBe(true);
    expect(r.isLast).toBe(true);
  });

  it("page > totalPages → clamps to last page", () => {
    const r = computePagination(99, 10, 25);
    expect(r.totalPages).toBe(3);
    expect(r.start).toBe(21);
    expect(r.end).toBe(25);
  });

  it("page < 1 → clamps to page 1", () => {
    const r = computePagination(-5, 10, 100);
    expect(r.start).toBe(1);
    expect(r.end).toBe(10);
  });

  it("pageSize <= 0 → coerced to 1 (defensive)", () => {
    const r = computePagination(1, 0, 5);
    expect(r.totalPages).toBe(5);
    expect(r.end).toBe(1);
  });

  it("total < 0 → coerced to 0", () => {
    const r = computePagination(1, 10, -50);
    expect(r.totalPages).toBe(1);
    expect(r.start).toBe(0);
    expect(r.end).toBe(0);
  });

  it("isFirst + isLast both true when only 1 page", () => {
    const r = computePagination(1, 100, 5);
    expect(r.isFirst).toBe(true);
    expect(r.isLast).toBe(true);
  });

  it("totalPages = ceil(total / pageSize)", () => {
    expect(computePagination(1, 7, 100).totalPages).toBe(15);
    expect(computePagination(1, 50, 50).totalPages).toBe(1);
    expect(computePagination(1, 50, 51).totalPages).toBe(2);
  });
});
