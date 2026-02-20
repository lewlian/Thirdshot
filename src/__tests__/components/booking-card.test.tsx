/**
 * Integration tests for BookingCard component
 * Tests user interactions and state management
 */

import { render, screen, waitFor } from "@testing-library/react";
import { BookingCard } from "@/components/booking/booking-card";
import { useRouter } from "next/navigation";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

// Mock next/link
jest.mock("next/link", () => {
  return ({ children, href }: any) => {
    return <a href={href}>{children}</a>;
  };
});

const mockRefresh = jest.fn();
(useRouter as jest.Mock).mockReturnValue({
  refresh: mockRefresh,
  push: jest.fn(),
  back: jest.fn(),
});

describe("BookingCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  const createMockBooking = (overrides: any = {}) => ({
    id: "booking-123",
    type: "COURT_BOOKING",
    total_cents: 4000,
    currency: "SGD",
    status: "CONFIRMED",
    expires_at: null,
    booking_slots: [
      {
        id: "slot-1",
        start_time: "2026-01-20T10:00:00",
        end_time: "2026-01-20T11:00:00",
        courts: {
          name: "Court A",
          is_indoor: true,
        },
      },
    ],
    ...overrides,
  });

  describe("confirmed bookings", () => {
    it("should render confirmed booking details", () => {
      const booking = createMockBooking();
      render(<BookingCard booking={booking} />);

      expect(screen.getByText("Court Booking")).toBeInTheDocument();
      expect(screen.getByText("$40.00 SGD")).toBeInTheDocument();
      expect(screen.getByText("Court A")).toBeInTheDocument();
    });

    it("should display booking status badge", () => {
      const booking = createMockBooking();
      render(<BookingCard booking={booking} />);

      expect(screen.getByText("Confirmed")).toBeInTheDocument();
    });

    it("should show View button for confirmed bookings", () => {
      const booking = createMockBooking();
      render(<BookingCard booking={booking} />);

      const viewButton = screen.getByRole("link", { name: /View/i });
      expect(viewButton).toBeInTheDocument();
      expect(viewButton).toHaveAttribute("href", "/bookings/booking-123");
    });

    it("should not show Pay Now button for confirmed bookings", () => {
      const booking = createMockBooking();
      render(<BookingCard booking={booking} />);

      expect(screen.queryByText("Pay Now")).not.toBeInTheDocument();
    });
  });

  describe("pending payment bookings", () => {
    it("should show Pay Now button for pending bookings", () => {
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
      const booking = createMockBooking({
        status: "PENDING_PAYMENT",
        expires_at: expiresAt,
      });

      render(<BookingCard booking={booking} />);

      expect(screen.getByText("Pay Now")).toBeInTheDocument();
    });

    it("should display expiration countdown", () => {
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
      const booking = createMockBooking({
        status: "PENDING_PAYMENT",
        expires_at: expiresAt,
      });

      render(<BookingCard booking={booking} />);

      expect(screen.getByText(/Expires in/i)).toBeInTheDocument();
    });

    it("should update countdown every second", async () => {
      const expiresAt = new Date(Date.now() + 125 * 1000); // 2:05 from now
      const booking = createMockBooking({
        status: "PENDING_PAYMENT",
        expires_at: expiresAt,
      });

      render(<BookingCard booking={booking} />);

      // Initial countdown
      expect(screen.getByText(/2:0[45]/)).toBeInTheDocument();

      // Advance 1 second
      jest.advanceTimersByTime(1000);
      await waitFor(() => {
        expect(screen.getByText(/2:0[34]/)).toBeInTheDocument();
      });
    });

    it("should show warning color when time is low", () => {
      const expiresAt = new Date(Date.now() + 90 * 1000); // 90 seconds (< 2 minutes)
      const booking = createMockBooking({
        status: "PENDING_PAYMENT",
        expires_at: expiresAt,
      });

      render(<BookingCard booking={booking} />);

      const timeDisplay = screen.getByText(/Expires in/i).parentElement;
      expect(timeDisplay?.querySelector(".text-destructive")).toBeInTheDocument();
    });

    it("should not show warning color when time is sufficient", () => {
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
      const booking = createMockBooking({
        status: "PENDING_PAYMENT",
        expires_at: expiresAt,
      });

      render(<BookingCard booking={booking} />);

      const timeDisplay = screen.getByText(/Expires in/i).parentElement;
      expect(timeDisplay?.querySelector(".text-muted-foreground")).toBeInTheDocument();
    });

    it("should trigger refresh when countdown reaches zero", async () => {
      const expiresAt = new Date(Date.now() + 2000); // 2 seconds from now
      const booking = createMockBooking({
        status: "PENDING_PAYMENT",
        expires_at: expiresAt,
      });

      render(<BookingCard booking={booking} />);

      // Fast-forward past expiration + delay
      jest.advanceTimersByTime(4000); // 2s expiration + 2s delay

      await waitFor(
        () => {
          expect(mockRefresh).toHaveBeenCalled();
        },
        { timeout: 5000 }
      );
    });

    it("should show expired message when countdown reaches zero", async () => {
      const expiresAt = new Date(Date.now() + 1000); // 1 second from now
      const booking = createMockBooking({
        status: "PENDING_PAYMENT",
        expires_at: expiresAt,
      });

      render(<BookingCard booking={booking} />);

      // Fast-forward past expiration
      jest.advanceTimersByTime(1100);

      await waitFor(() => {
        expect(screen.getByText(/expired.*Refreshing/i)).toBeInTheDocument();
      });
    });

    it("should hide Pay Now button when expired", async () => {
      const expiresAt = new Date(Date.now() + 1000);
      const booking = createMockBooking({
        status: "PENDING_PAYMENT",
        expires_at: expiresAt,
      });

      render(<BookingCard booking={booking} />);

      // Initially should have Pay Now button
      expect(screen.getByText("Pay Now")).toBeInTheDocument();

      // Fast-forward past expiration
      jest.advanceTimersByTime(1100);

      await waitFor(() => {
        expect(screen.queryByText("Pay Now")).not.toBeInTheDocument();
      });
    });
  });

  describe("multiple slots", () => {
    it("should display all slots", () => {
      const booking = createMockBooking({
        booking_slots: [
          {
            id: "slot-1",
            start_time: "2026-01-20T10:00:00",
            end_time: "2026-01-20T11:00:00",
            courts: { name: "Court A", is_indoor: true },
          },
          {
            id: "slot-2",
            start_time: "2026-01-20T11:00:00",
            end_time: "2026-01-20T12:00:00",
            courts: { name: "Court A", is_indoor: true },
          },
          {
            id: "slot-3",
            start_time: "2026-01-20T12:00:00",
            end_time: "2026-01-20T13:00:00",
            courts: { name: "Court B", is_indoor: false },
          },
        ],
      });

      render(<BookingCard booking={booking} />);

      expect(screen.getAllByText(/Court/)).toHaveLength(3);
      expect(screen.getByText("Court A")).toBeInTheDocument();
      expect(screen.getByText("Court B")).toBeInTheDocument();
    });

    it("should display time ranges for each slot", () => {
      const booking = createMockBooking({
        booking_slots: [
          {
            id: "slot-1",
            start_time: "2026-01-20T10:00:00",
            end_time: "2026-01-20T11:00:00",
            courts: { name: "Court A", is_indoor: true },
          },
          {
            id: "slot-2",
            start_time: "2026-01-20T14:00:00",
            end_time: "2026-01-20T15:00:00",
            courts: { name: "Court B", is_indoor: true },
          },
        ],
      });

      render(<BookingCard booking={booking} />);

      expect(screen.getByText(/10:00.*11:00/)).toBeInTheDocument();
      expect(screen.getByText(/14:00.*15:00/)).toBeInTheDocument() ||
             expect(screen.getByText(/2:00.*3:00/)).toBeInTheDocument();
    });
  });

  describe("booking types", () => {
    it("should display Court Booking type", () => {
      const booking = createMockBooking({ type: "COURT_BOOKING" });
      render(<BookingCard booking={booking} />);

      expect(screen.getByText("Court Booking")).toBeInTheDocument();
    });

    it("should display Corporate Booking type", () => {
      const booking = createMockBooking({ type: "CORPORATE_BOOKING" });
      render(<BookingCard booking={booking} />);

      expect(screen.getByText("Corporate Booking")).toBeInTheDocument();
    });

    it("should display Private Coaching type", () => {
      const booking = createMockBooking({ type: "PRIVATE_COACHING" });
      render(<BookingCard booking={booking} />);

      expect(screen.getByText("Private Coaching")).toBeInTheDocument();
    });
  });

  describe("booking statuses", () => {
    it("should display Pending status", () => {
      const booking = createMockBooking({
        status: "PENDING_PAYMENT",
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });
      render(<BookingCard booking={booking} />);

      expect(screen.getByText("Pending")).toBeInTheDocument();
    });

    it("should display Cancelled status", () => {
      const booking = createMockBooking({ status: "CANCELLED" });
      render(<BookingCard booking={booking} />);

      expect(screen.getByText("Cancelled")).toBeInTheDocument();
    });

    it("should display Expired status", () => {
      const booking = createMockBooking({ status: "EXPIRED" });
      render(<BookingCard booking={booking} />);

      expect(screen.getByText("Expired")).toBeInTheDocument();
    });

    it("should display Completed status", () => {
      const booking = createMockBooking({ status: "COMPLETED" });
      render(<BookingCard booking={booking} />);

      expect(screen.getByText("Completed")).toBeInTheDocument();
    });
  });

  describe("price display", () => {
    it("should format price correctly", () => {
      const booking = createMockBooking({ total_cents: 4500 });
      render(<BookingCard booking={booking} />);

      expect(screen.getByText("$45.00 SGD")).toBeInTheDocument();
    });

    it("should handle zero cents", () => {
      const booking = createMockBooking({ total_cents: 0 });
      render(<BookingCard booking={booking} />);

      expect(screen.getByText("$0.00 SGD")).toBeInTheDocument();
    });

    it("should handle large amounts", () => {
      const booking = createMockBooking({ total_cents: 100000 }); // $1000
      render(<BookingCard booking={booking} />);

      expect(screen.getByText("$1000.00 SGD")).toBeInTheDocument();
    });
  });
});
