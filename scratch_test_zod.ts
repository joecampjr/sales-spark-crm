import { z } from 'zod';

const UpdateLeadSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(8).optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  estimatedValue: z.number().nullable().optional(),
  source: z.string().optional(),
  sellerId: z.string().nullable().optional(),
  cpf: z.string().nullable().optional(),
  branchId: z.string().nullable().optional(),
});

const body = {
  id: 'some-id',
  sellerId: 'a21de4aa-6659-468b-8aa2-9dc447c52331'
};

const data = UpdateLeadSchema.parse(body);
console.log('Parsed data:', data);

const allowedFields = ['status', 'sellerId'];
const fieldsBeingUpdated = Object.keys(data).filter(k => (data as any)[k] !== undefined);
const isUpdatingRestrictedFields = fieldsBeingUpdated.some(k => !allowedFields.includes(k));

console.log('fieldsBeingUpdated:', fieldsBeingUpdated);
console.log('isUpdatingRestrictedFields:', isUpdatingRestrictedFields);
