/**
 * Active-nav-item detection.
 *
 * A sidebar/breadcrumb item is "active" when the current pathname matches
 * the link's href exactly OR is a child route. Track VVVVV — extracted
 * from src/components/DashboardSidebar.tsx so the prefix-vs-child match
 * trap is documented + tested.
 *
 * `/dashboard/alertsfoo` must NOT match `/dashboard/alerts` (sibling page
 * with similar prefix). Only `/dashboard/alerts/<sub>` or exact equality
 * count.
 */
export function isNavActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  return pathname.startsWith(href + "/");
}
