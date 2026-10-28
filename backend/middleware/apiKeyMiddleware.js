function requireApiKey(req, res, next) {
  const userKey = req.headers['x-api-key'];
  if (userKey && userKey === process.env.API_KEY) {
    next();
  } else {
    res.status(401).json({ message: "Invalid or missing API key" });
  }
}

module.exports = requireApiKey; 