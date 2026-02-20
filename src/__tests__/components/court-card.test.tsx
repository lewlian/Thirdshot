/**
 * Unit tests for CourtCard component
 */

import { render, screen } from "@testing-library/react";
import { CourtCard } from "@/components/common/court-card";

const mockCourt = {
  id: "court-1",
  name: "Court A",
  description: "Indoor court with premium surface",
  is_active: true,
  is_indoor: true,
  price_per_hour_cents: 2000,
  peak_price_per_hour_cents: 3000,
  surface_type: "Premium",
  has_lighting: true,
  open_time: "08:00",
  close_time: "22:00",
  slot_duration_minutes: 60,
  sort_order: 1,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe("CourtCard", () => {
  it("should render court name", () => {
    render(<CourtCard court={mockCourt} />);
    expect(screen.getByText("Court A")).toBeInTheDocument();
  });

  it("should render court description", () => {
    render(<CourtCard court={mockCourt} />);
    expect(
      screen.getByText("Indoor court with premium surface")
    ).toBeInTheDocument();
  });

  it("should display Indoor badge for indoor courts", () => {
    render(<CourtCard court={mockCourt} />);
    expect(screen.getByText("Indoor")).toBeInTheDocument();
  });

  it("should display Outdoor badge for outdoor courts", () => {
    const outdoorCourt = { ...mockCourt, is_indoor: false };
    render(<CourtCard court={outdoorCourt} />);
    expect(screen.getByText("Outdoor")).toBeInTheDocument();
  });

  it("should display standard price", () => {
    render(<CourtCard court={mockCourt} />);
    expect(screen.getByText("$20")).toBeInTheDocument();
    expect(screen.getByText("/hr")).toBeInTheDocument();
  });

  it("should display peak price when available", () => {
    render(<CourtCard court={mockCourt} />);
    expect(screen.getByText("$30/hr peak hours")).toBeInTheDocument();
  });

  it("should not display peak price when not set", () => {
    const noPeakCourt = { ...mockCourt, peak_price_per_hour_cents: null };
    render(<CourtCard court={noPeakCourt} />);
    expect(screen.queryByText(/peak/)).not.toBeInTheDocument();
  });

  it("should display surface type", () => {
    render(<CourtCard court={mockCourt} />);
    expect(screen.getByText("Premium")).toBeInTheDocument();
  });

  it("should display lighting indicator", () => {
    render(<CourtCard court={mockCourt} />);
    expect(screen.getByText("Lighting")).toBeInTheDocument();
  });

  it("should not display lighting when not available", () => {
    const noLightingCourt = { ...mockCourt, has_lighting: false };
    render(<CourtCard court={noLightingCourt} />);
    expect(screen.queryByText("Lighting")).not.toBeInTheDocument();
  });

  it("should display operating hours", () => {
    render(<CourtCard court={mockCourt} />);
    expect(screen.getByText(/08:00.*22:00/)).toBeInTheDocument();
  });

  it("should have Book Now button with correct link", () => {
    render(<CourtCard court={mockCourt} />);
    const bookButton = screen.getByRole("link", { name: /Book Now/i });
    expect(bookButton).toHaveAttribute("href", "/courts/court-1");
  });
});
