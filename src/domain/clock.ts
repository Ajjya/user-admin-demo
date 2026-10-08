/** Source of the current time, injected so that time-dependent rules are testable. */
export type Clock = () => Date;
