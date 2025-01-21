import verifyToken from '../models/authMiddleware';
import express from 'express'


const router = express.Router();
// Protected route
router.get('/', verifyToken, (req, res) => {
res.status(200).json({ message: 'Protected route accessed' });
});

export default router;