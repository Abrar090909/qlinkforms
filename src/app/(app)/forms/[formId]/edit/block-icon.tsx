import type { FieldType } from "@/lib/forms/schema";

const paths: Record<FieldType, string> = {
  short_text: "M4 8h16M4 12h10",
  long_text: "M4 7h16M4 11h16M4 15h10",
  email: "M4 6h16v12H4zM4 7l8 6 8-6",
  phone: "M8 3h8v18H8zM11 18h2",
  number: "M9 4L7 20M17 4l-2 16M4 9h16M3 15h16",
  date: "M5 6h14v14H5zM5 10h14M9 3v4M15 3v4",
  single_choice:
    "M12 12m-8 0a8 8 0 1 0 16 0a8 8 0 1 0-16 0M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0",
  multi_choice: "M4 4h16v16H4zM8 12l3 3 5-6",
  dropdown: "M4 6h16v12H4zM9 11l3 3 3-3",
  rating: "M12 4l2.4 5 5.6.8-4 3.9.9 5.5L12 16.6 7.1 19.2l.9-5.5-4-3.9 5.6-.8z",
  payment: "M3 7h18v10H3zM3 11h18M7 15h3",
  statement: "M5 6h14M12 6v13M9 19h6",
};

export function BlockIcon({
  type,
  className = "size-5",
}: {
  type: FieldType;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`shrink-0 text-fg-muted ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[type]} />
    </svg>
  );
}
