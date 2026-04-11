import { verifyToken } from '../utils/auth.js';

export const requireAuth = (role) => {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decodedPayload = verifyToken(token);

    if (!decodedPayload) {
      return res.status(401).json({ message: 'Invalid or expired token.' });
    }

    if (role && decodedPayload.role !== role) {
      return res.status(403).json({ message: `Access denied. Requires ${role} privileges.` });
    }

    req.user = decodedPayload;
    next();
  };
};

export const requireAdmin = requireAuth('admin');
export const requireTeacher = requireAuth('teacher');
export const requireStudent = requireAuth('student');
