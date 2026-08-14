import { Router, type IRouter } from "express";
import healthRouter from "./health";
import targetsRouter from "./targets";
import bookingsRouter from "./bookings";
import registrationsRouter from "./registrations";
import schedulerRouter from "./scheduler";

const router: IRouter = Router();

router.use(healthRouter);
router.use(targetsRouter);
router.use(bookingsRouter);
router.use(registrationsRouter);
router.use(schedulerRouter);

export default router;
