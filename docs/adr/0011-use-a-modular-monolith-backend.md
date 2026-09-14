# Use a modular monolith backend

The NestJS backend is a modular monolith with explicit Organization, Authorization, Billing, Audit, Notification, Integration, and File boundaries, while a separate worker executes durable BullMQ jobs from the same modules. Only UI code, generated API contracts, and tooling configuration live in shared workspace packages; persistence models and business services stay in the backend, avoiding distributed-service coordination without collapsing the system into an unstructured shared layer.
