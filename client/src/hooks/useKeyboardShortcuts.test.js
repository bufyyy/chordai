import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import useKeyboardShortcuts from './useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  let mockAction;

  beforeEach(() => {
    mockAction = vi.fn();
  });

  it('should trigger action on matching key', () => {
    const shortcuts = [{ key: 'l', action: mockAction }];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    const event = new KeyboardEvent('keydown', { key: 'l' });
    window.dispatchEvent(event);

    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  it('should handle ctrl modifier', () => {
    const shortcuts = [{ key: 's', ctrl: true, action: mockAction }];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    // Without ctrl - should not trigger
    let event = new KeyboardEvent('keydown', { key: 's' });
    window.dispatchEvent(event);
    expect(mockAction).not.toHaveBeenCalled();

    // With ctrl - should trigger
    event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true });
    window.dispatchEvent(event);
    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  it('should handle meta key (cmd on Mac)', () => {
    const shortcuts = [{ key: 's', ctrl: true, action: mockAction }];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    const event = new KeyboardEvent('keydown', { key: 's', metaKey: true });
    window.dispatchEvent(event);

    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  it('should handle shift modifier', () => {
    const shortcuts = [{ key: 'r', shift: true, action: mockAction }];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    const event = new KeyboardEvent('keydown', { key: 'r', shiftKey: true });
    window.dispatchEvent(event);

    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  it('should handle alt modifier', () => {
    const shortcuts = [{ key: 'n', alt: true, action: mockAction }];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    const event = new KeyboardEvent('keydown', { key: 'n', altKey: true });
    window.dispatchEvent(event);

    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  it('should ignore events when input is focused', () => {
    const shortcuts = [{ key: 'l', action: mockAction }];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    const input = document.createElement('input');
    document.body.appendChild(input);

    const event = new KeyboardEvent('keydown', { key: 'l', bubbles: true });
    Object.defineProperty(event, 'target', { value: input, enumerable: true });

    input.dispatchEvent(event);

    expect(mockAction).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it('should ignore events when textarea is focused', () => {
    const shortcuts = [{ key: 'l', action: mockAction }];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);

    const event = new KeyboardEvent('keydown', { key: 'l', bubbles: true });
    Object.defineProperty(event, 'target', { value: textarea, enumerable: true });

    textarea.dispatchEvent(event);

    expect(mockAction).not.toHaveBeenCalled();

    document.body.removeChild(textarea);
  });

  it('should handle multiple shortcuts', () => {
    const action1 = vi.fn();
    const action2 = vi.fn();
    const shortcuts = [
      { key: 'l', action: action1 },
      { key: 's', ctrl: true, action: action2 },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    // Trigger first shortcut
    let event = new KeyboardEvent('keydown', { key: 'l' });
    window.dispatchEvent(event);
    expect(action1).toHaveBeenCalledTimes(1);
    expect(action2).not.toHaveBeenCalled();

    // Trigger second shortcut
    event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true });
    window.dispatchEvent(event);
    expect(action2).toHaveBeenCalledTimes(1);
  });

  it('should handle space key', () => {
    const shortcuts = [{ key: ' ', action: mockAction }];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    const event = new KeyboardEvent('keydown', { key: ' ' });
    window.dispatchEvent(event);

    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  it('should handle escape key', () => {
    const shortcuts = [{ key: 'escape', action: mockAction }];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    window.dispatchEvent(event);

    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  it('should be case-insensitive for keys', () => {
    const shortcuts = [{ key: 'l', action: mockAction }];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    // Uppercase L
    const event = new KeyboardEvent('keydown', { key: 'L' });
    window.dispatchEvent(event);

    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  it('should prevent default behavior', () => {
    const shortcuts = [{ key: 's', ctrl: true, action: mockAction }];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    const event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

    window.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('should cleanup event listener on unmount', () => {
    const shortcuts = [{ key: 'l', action: mockAction }];

    const { unmount } = renderHook(() => useKeyboardShortcuts(shortcuts));

    unmount();

    const event = new KeyboardEvent('keydown', { key: 'l' });
    window.dispatchEvent(event);

    // Should not be called after unmount
    expect(mockAction).not.toHaveBeenCalled();
  });

  it('should handle empty shortcuts array', () => {
    const shortcuts = [];

    expect(() => {
      renderHook(() => useKeyboardShortcuts(shortcuts));
    }).not.toThrow();
  });

  it('should stop at first matching shortcut', () => {
    const action1 = vi.fn();
    const action2 = vi.fn();
    const shortcuts = [
      { key: 'l', action: action1 },
      { key: 'l', action: action2 }, // Duplicate
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    const event = new KeyboardEvent('keydown', { key: 'l' });
    window.dispatchEvent(event);

    expect(action1).toHaveBeenCalledTimes(1);
    expect(action2).not.toHaveBeenCalled();
  });
});
