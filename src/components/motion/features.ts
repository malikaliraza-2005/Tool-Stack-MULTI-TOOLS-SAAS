import { domMax } from "motion/react";

// Loaded asynchronously by MotionProvider. domMax (not domAnimation) because
// sliding indicators use layout animations (`layoutId`), which need it.
export default domMax;
