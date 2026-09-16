"use client";

import { useAuth, useOrganizationList } from "@clerk/nextjs";
import { createApiClient, type components } from "@saas/api-client";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  FormField,
  Input,
  LoadingState,
  Select,
} from "@saas/ui";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

type ProblemDetails = components["schemas"]["ProblemDetailsDto"];
type CreateOrganization = components["schemas"]["CreateOrganizationDto"];
type FieldErrors = Partial<
  Record<"locale" | "name" | "slug" | "timeZone", string>
>;

const localeOptions = [
  { label: "Português (Brasil)", value: "pt-BR" },
  { label: "English (United States)", value: "en-US" },
];
const timeZoneOptions = [
  { label: "Cuiabá", value: "America/Cuiaba" },
  { label: "São Paulo", value: "America/Sao_Paulo" },
  { label: "UTC", value: "UTC" },
];

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function fieldErrors(problem: ProblemDetails | undefined): FieldErrors {
  return Object.fromEntries(
    (problem?.errors ?? []).flatMap((error) => {
      const field = error.pointer.replace("#/body/", "");
      return ["locale", "name", "slug", "timeZone"].includes(field)
        ? [[field, error.detail]]
        : [];
    }),
  );
}

export function OrganizationOnboarding({ apiUrl }: { apiUrl: string }) {
  const router = useRouter();
  const { getToken } = useAuth();
  const { isLoaded, setActive, userInvitations, userMemberships } =
    useOrganizationList({
      userInvitations: { status: "pending" },
      userMemberships: true,
    });
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [locale, setLocale] = useState<CreateOrganization["locale"]>("pt-BR");
  const [timeZone, setTimeZone] =
    useState<CreateOrganization["timeZone"]>("America/Cuiaba");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [problem, setProblem] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const submission = useRef<{ key: string; payload: string } | undefined>(
    undefined,
  );

  if (!isLoaded || userInvitations.isLoading || userMemberships.isLoading) {
    return (
      <LoadingState
        description="Checking your Organization access."
        label="Loading Organization onboarding"
      />
    );
  }

  if (userInvitations.count > 0) {
    return (
      <EmptyState
        description="You already have a pending Invitation. Invitation acceptance is handled from the Organization access flow."
        title="An Invitation is waiting"
      />
    );
  }

  if (userMemberships.count > 0) {
    return (
      <EmptyState
        description="Select one of your Organizations to continue."
        title="Choose an Active Organization"
      />
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !setActive) return;

    const body: CreateOrganization = { name, slug, locale, timeZone };
    const payload = JSON.stringify(body);
    if (submission.current?.payload !== payload) {
      submission.current = { key: crypto.randomUUID(), payload };
    }

    setSubmitting(true);
    setErrors({});
    setProblem(undefined);

    try {
      const token = await getToken();
      if (!token)
        throw new Error("Your session is unavailable. Sign in again.");

      const client = createApiClient(apiUrl);
      const { data, error } = await client.POST("/v1/organizations", {
        body,
        cache: "no-store",
        headers: { authorization: `Bearer ${token}` },
        params: {
          header: { "Idempotency-Key": submission.current.key },
        },
      });

      if (!data) {
        setErrors(fieldErrors(error));
        setProblem(
          error?.detail ?? "The Organization could not be created. Try again.",
        );
        return;
      }

      await setActive({ organization: data.organization.id });
      router.push(
        `/organizations/${encodeURIComponent(data.organization.slug)}`,
      );
      router.refresh();
    } catch (error) {
      setProblem(
        error instanceof Error
          ? error.message
          : "The Organization could not be created. Try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto grid w-full max-w-3xl gap-6 py-6 sm:py-10">
      <header className="grid gap-2">
        <p className="eyebrow">Organization onboarding</p>
        <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
          Create your first Organization
        </h1>
        <p className="max-w-2xl leading-7 text-muted">
          This becomes the secure home for your Memberships, product data, and
          billing. You will start as its Owner.
        </p>
      </header>

      {problem ? (
        <ErrorState
          description={problem}
          title="Organization could not be created"
        />
      ) : null}

      <Card
        description="You can change these profile settings later."
        title="Organization profile"
      >
        <form className="grid gap-5 sm:grid-cols-2" onSubmit={submit}>
          <FormField
            className="sm:col-span-2"
            error={errors.name}
            label="Organization name"
            required
          >
            <Input
              aria-invalid={Boolean(errors.name) || undefined}
              autoComplete="organization"
              maxLength={100}
              minLength={2}
              name="name"
              onChange={(event) => {
                const nextName = event.target.value;
                setName(nextName);
                if (!slugEdited) setSlug(slugify(nextName));
              }}
              required
              value={name}
            />
          </FormField>

          <FormField
            className="sm:col-span-2"
            description="Lowercase letters, numbers, and single hyphens."
            error={errors.slug}
            label="Organization URL slug"
            required
          >
            <Input
              aria-invalid={Boolean(errors.slug) || undefined}
              autoCapitalize="none"
              maxLength={48}
              minLength={3}
              name="slug"
              onChange={(event) => {
                setSlugEdited(true);
                setSlug(event.target.value.toLowerCase());
              }}
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              required
              spellCheck={false}
              value={slug}
            />
          </FormField>

          <FormField error={errors.locale} label="Default locale" required>
            <Select
              invalid={Boolean(errors.locale)}
              label="Default locale"
              name="locale"
              onValueChange={(value) => {
                if (value === "pt-BR" || value === "en-US") setLocale(value);
              }}
              options={localeOptions}
              required
              value={locale}
            />
          </FormField>

          <FormField error={errors.timeZone} label="Default time zone" required>
            <Select
              invalid={Boolean(errors.timeZone)}
              label="Default time zone"
              name="timeZone"
              onValueChange={(value) => {
                if (
                  value === "America/Cuiaba" ||
                  value === "America/Sao_Paulo" ||
                  value === "UTC"
                ) {
                  setTimeZone(value);
                }
              }}
              options={timeZoneOptions}
              required
              value={timeZone}
            />
          </FormField>

          <div className="flex justify-end sm:col-span-2">
            <Button
              loading={submitting}
              loadingLabel="Creating Organization"
              type="submit"
            >
              Create Organization
            </Button>
          </div>
        </form>
      </Card>
    </main>
  );
}
