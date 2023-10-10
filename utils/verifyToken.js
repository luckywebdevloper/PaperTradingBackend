import jwt from "jsonwebtoken";

const key = process.env.JWT_SECRET;

const verifyToken = (req, res, next) => {
  const bearerHeader = req.headers.authorization;

  if (!bearerHeader) {
    return res
      .status(403)
      .send({ message: "No token provided!", status: false });
  }

  if (bearerHeader) {
    const bearer = bearerHeader.split(" ");
    const bearerToken = bearer[1];
    req.token = bearerToken;

    jwt.verify(bearerToken, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res
          .status(401)
          .send({ message: "Unauthorized!", status: false });
      }
      req.user = decoded;
      next();
    });
  }
};

export default verifyToken;
