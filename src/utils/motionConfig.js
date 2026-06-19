import { useReducedMotion } from 'framer-motion';

export const ease = [0.22, 1, 0.36, 1];

export const duration = {
  fast: 0.16,
  normal: 0.22,
  slow: 0.32,
};

export const boardVariants = {
  hidden: {},
  visible: {
    transition: {
      delayChildren: 0.03,
      staggerChildren: 0.035,
    },
  },
};

function directionalCardExit(intent = 'default') {
  const base = {
    opacity: 0,
    transition: { duration: duration.fast, ease: [0.4, 0, 1, 1] },
  };

  if (intent === 'archive') {
    return {
      ...base,
      x: -40,
      y: 10,
      scale: 0.94,
      rotate: -2.5,
      filter: 'blur(1px)',
    };
  }

  if (intent === 'restore') {
    return {
      ...base,
      x: 36,
      y: -8,
      scale: 0.96,
      rotate: 1.5,
    };
  }

  if (intent === 'delete') {
    return {
      ...base,
      y: 24,
      scale: 0.88,
      rotate: 3,
      filter: 'blur(2px)',
      transition: { duration: 0.2, ease: [0.4, 0, 1, 1] },
    };
  }

  return {
    ...base,
    scale: 0.93,
    y: 10,
    rotate: 1.5,
  };
}

// Card entrance: placed onto the board
export const cardVariants = {
  hidden: {
    opacity: 0,
    scale: 0.96,
    y: 12,
    rotate: -0.8,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    rotate: 0,
    transition: { duration: duration.normal, ease },
  },
  exit: directionalCardExit,
};

// Modal panel
export const modalVariants = {
  hidden: { opacity: 0, scale: 0.96, y: 16 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: duration.normal, ease },
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    y: 8,
    transition: { duration: duration.fast, ease: [0.4, 0, 1, 1] },
  },
};

// Modal backdrop
export const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

// Confirm dialog panel
export const confirmVariants = {
  hidden: { opacity: 0, scale: 0.97, y: -8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: duration.fast, ease },
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    y: 8,
    transition: { duration: duration.fast, ease: [0.4, 0, 1, 1] },
  },
};

// Empty state
export const emptyStateVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.normal, ease },
  },
};

// Hook to get reduced-motion-safe variants
export function useSafeMotion() {
  const reduced = useReducedMotion();
  if (reduced) {
    const instant = { transition: { duration: 0 } };
    return {
      cardVariants: {
        hidden: { opacity: 0 },
        visible: { opacity: 1, ...instant },
        exit: { opacity: 0, ...instant },
      },
      modalVariants: {
        hidden: { opacity: 0 },
        visible: { opacity: 1, ...instant },
        exit: { opacity: 0, ...instant },
      },
      backdropVariants: {
        hidden: { opacity: 0 },
        visible: { opacity: 1, ...instant },
        exit: { opacity: 0, ...instant },
      },
      confirmVariants: {
        hidden: { opacity: 0 },
        visible: { opacity: 1, ...instant },
        exit: { opacity: 0, ...instant },
      },
      emptyStateVariants: {
        hidden: { opacity: 0 },
        visible: { opacity: 1, ...instant },
      },
      boardVariants: {
        hidden: {},
        visible: {},
      },
      layoutTransition: false,
    };
  }
  return {
    boardVariants,
    cardVariants,
    modalVariants,
    backdropVariants,
    confirmVariants,
    emptyStateVariants,
    layoutTransition: { duration: duration.normal, ease },
  };
}
