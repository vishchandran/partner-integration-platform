const rejectInvalid = (res, errors) => {
  if (errors.length === 0) return false;

  res.status(400).json({ message: "Validation failed", errors });
  return true;
};

module.exports = rejectInvalid;
