import type { Metadata } from "next";
import "@/styles.css";

export const metadata: Metadata = {
  title: "Vidya Pods — Free Home Tuitions for Every Child",
  description:
    "A pod-based education system bringing free home tuitions to school-going kids. Sponsor a pod. Change a life.",
  authors: [{ name: "The Boring Education" }],
  openGraph: {
    title: "Vidya Pods — Free Home Tuitions for Every Child",
    description:
      "A pod-based education system bringing free home tuitions to school-going kids. Sponsor a pod. Change a life.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vidya Pods — Free Home Tuitions for Every Child",
    description:
      "A pod-based education system bringing free home tuitions to school-going kids. Sponsor a pod. Change a life.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700;9..144,900&family=Inter:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
