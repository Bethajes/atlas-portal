const { z } = require('zod');

const registrationDraftSchema = z.object({
  courseIds: z.array(z.string().uuid()).min(1, 'Select at least one course'),
});

const submitRegistrationSchema = z.object({
  registrationId: z.string().uuid(),
  // Add more if needed
});

module.exports = {
  registrationDraftSchema,
  submitRegistrationSchema,
};
