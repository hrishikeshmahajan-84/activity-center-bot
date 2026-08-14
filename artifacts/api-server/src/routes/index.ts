import { Router, type IRouter } from "express";
import healthRouter from "./health";
import targetsRouter from "./targets";
import bookingsRouter from "./bookings";
import registrationsRouter from "./registrations";
import schedulerRouter from "./scheduler";
import scrapeRouter from "./scrape";
// Note: trigger-now is registered inside schedulerRouter

const router: IRouter = Router();

router.use(healthRouter);
router.use(targetsRouter);
router.use(bookingsRouter);
router.use(registrationsRouter);
router.use(scrapeRouter);
router.use(schedulerRouter);

export default router;
