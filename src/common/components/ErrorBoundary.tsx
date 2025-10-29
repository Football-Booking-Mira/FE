// import React from "react";

// interface Props {
//   children: React.ReactNode;
//   fallback?: React.ReactNode;
// }

// interface State {
//   hasError: boolean;
// }

// export class ErrorBoundary extends React.Component<Props, State> {
//   constructor(props: Props) {
//     super(props);
//     this.state = { hasError: false };
//   }

//   static getDerivedStateFromError() {
//     return { hasError: true };
//   }

//   componentDidCatch(): void {
//     // Intentionally left blank; override/logging can be added later.
//   }

//   render() {
//     if (this.state.hasError) {
//       return this.props.fallback || null;
//     }

//     return this.props.children;
//   }
// }

// export default ErrorBoundary;

import React from "react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(): void {
    // Intentionally left blank; override/logging can be added later.
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || null;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
