import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NotFoundPage } from "../not-found";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

describe("NotFoundPage", () => {
  it("should render 404 heading", () => {
    render(<NotFoundPage />);
    expect(screen.getByText("404")).toBeInTheDocument();
  });

  it("should render 'Page not found' subheading", () => {
    render(<NotFoundPage />);
    expect(screen.getByText("Page not found")).toBeInTheDocument();
  });

  it("should render descriptive text", () => {
    render(<NotFoundPage />);
    expect(
      screen.getByText(
        /the page you're looking for doesn't exist or has been moved/i,
      ),
    ).toBeInTheDocument();
  });

  it("should render a link to the home page", () => {
    render(<NotFoundPage />);
    const homeLink = screen.getByRole("link", { name: /go home/i });
    expect(homeLink).toBeInTheDocument();
    expect(homeLink).toHaveAttribute("href", "/");
  });
});
