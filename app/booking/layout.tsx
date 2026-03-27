import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "코트예약 도우미",
};

export default function BookingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
