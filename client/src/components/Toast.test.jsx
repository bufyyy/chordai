import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import Toast from './Toast';
import useStore from '../store/useStore';

// Mock the store
vi.mock('../store/useStore');

describe('Toast Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render toast notifications', () => {
    useStore.mockReturnValue({
      toasts: [
        {
          id: 1,
          type: 'success',
          message: 'Operation successful',
          duration: 3000,
        },
      ],
      removeToast: vi.fn(),
    });

    render(<Toast />);

    expect(screen.getByText('Operation successful')).toBeInTheDocument();
  });

  it('should render multiple toasts', () => {
    useStore.mockReturnValue({
      toasts: [
        { id: 1, type: 'success', message: 'Success message' },
        { id: 2, type: 'error', message: 'Error message' },
        { id: 3, type: 'warning', message: 'Warning message' },
      ],
      removeToast: vi.fn(),
    });

    render(<Toast />);

    expect(screen.getByText('Success message')).toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();
    expect(screen.getByText('Warning message')).toBeInTheDocument();
  });

  it('should render toast with title', () => {
    useStore.mockReturnValue({
      toasts: [
        {
          id: 1,
          type: 'info',
          title: 'Information',
          message: 'Details here',
        },
      ],
      removeToast: vi.fn(),
    });

    render(<Toast />);

    expect(screen.getByText('Information')).toBeInTheDocument();
    expect(screen.getByText('Details here')).toBeInTheDocument();
  });

  it('should call removeToast when close button clicked', async () => {
    const removeToast = vi.fn();
    useStore.mockReturnValue({
      toasts: [
        {
          id: 1,
          type: 'success',
          message: 'Test message',
        },
      ],
      removeToast,
    });

    render(<Toast />);

    const closeButton = screen.getByLabelText('Close');
    await userEvent.click(closeButton);

    expect(removeToast).toHaveBeenCalledWith(1);
  });

  it('should auto-dismiss after duration', async () => {
    vi.useFakeTimers();
    const removeToast = vi.fn();

    useStore.mockReturnValue({
      toasts: [
        {
          id: 1,
          type: 'success',
          message: 'Auto dismiss',
          duration: 2000,
        },
      ],
      removeToast,
    });

    render(<Toast />);

    expect(screen.getByText('Auto dismiss')).toBeInTheDocument();

    // Fast-forward time
    vi.advanceTimersByTime(2000);

    await waitFor(() => {
      expect(removeToast).toHaveBeenCalledWith(1);
    });

    vi.useRealTimers();
  });

  it('should render different toast types with correct styles', () => {
    const types = ['success', 'error', 'warning', 'info'];

    types.forEach((type) => {
      useStore.mockReturnValue({
        toasts: [
          {
            id: 1,
            type,
            message: `${type} message`,
          },
        ],
        removeToast: vi.fn(),
      });

      const { container } = render(<Toast />);

      const toast = container.querySelector('[class*="bg-"]');
      expect(toast).toBeInTheDocument();
    });
  });

  it('should render empty when no toasts', () => {
    useStore.mockReturnValue({
      toasts: [],
      removeToast: vi.fn(),
    });

    const { container } = render(<Toast />);

    expect(container.querySelector('.fixed')).toBeEmptyDOMElement();
  });

  it('should handle toast without title', () => {
    useStore.mockReturnValue({
      toasts: [
        {
          id: 1,
          type: 'info',
          message: 'No title toast',
        },
      ],
      removeToast: vi.fn(),
    });

    render(<Toast />);

    expect(screen.getByText('No title toast')).toBeInTheDocument();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('should cleanup timer on unmount', () => {
    vi.useFakeTimers();
    const removeToast = vi.fn();

    useStore.mockReturnValue({
      toasts: [
        {
          id: 1,
          type: 'success',
          message: 'Test',
          duration: 3000,
        },
      ],
      removeToast,
    });

    const { unmount } = render(<Toast />);

    unmount();

    vi.advanceTimersByTime(3000);

    // Should not call after unmount
    expect(removeToast).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('should show correct icon for each toast type', () => {
    const types = ['success', 'error', 'warning', 'info'];

    types.forEach((type) => {
      useStore.mockReturnValue({
        toasts: [
          {
            id: 1,
            type,
            message: 'Test',
          },
        ],
        removeToast: vi.fn(),
      });

      const { container } = render(<Toast />);
      const svg = container.querySelector('svg');

      expect(svg).toBeInTheDocument();
    });
  });
});
