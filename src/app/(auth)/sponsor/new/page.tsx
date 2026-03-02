"use client"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useState } from "react"
import type { Id } from "@/convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Trash2, Info, Github, ExternalLink } from "lucide-react"

const rubricCriterionSchema = z.object({
    name: z.string().min(1, "Criterion name is required"),
    maxScore: z.coerce.number().min(1, "Must be at least 1").max(100, "Must be at most 100"),
    description: z.string().min(1, "Description is required"),
})

const schema = z.object({
    title: z.string().min(5, "Title must be at least 5 characters"),
    summary: z.string().min(20),
    overview: z.string().min(50),
    problemStatement: z.string().min(50),
    tags: z.string().min(1, "At least one tag is required"),
    difficulty: z.enum(["beginner", "intermediate", "advanced", "expert"]),
    prize: z.string().min(1),
    deadlineDays: z.coerce.number().min(1).max(365),
    dataPackUrl: z.string().url("Must be a valid URL").or(z.literal("")),
    templateRepoUrl: z.string().url("Must be a valid URL").or(z.literal("")),
    testRunCommand: z.string().or(z.literal("")),
    rubricCriteria: z.array(rubricCriterionSchema),
})

type FormValues = z.infer<typeof schema>

export default function NewChallengePage() {
    const router = useRouter()
    const createChallenge = useMutation(api.challenges.create)
    const generateUploadUrl = useMutation(api.challenges.generateUploadUrl)
    const judges = useQuery(api.users.listJudges)
    const [selectedJudges, setSelectedJudges] = useState<Id<"users">[]>([])
    const [hiddenTestFiles, setHiddenTestFiles] = useState<File[]>([])

    const form = useForm<FormValues>({
        resolver: zodResolver(schema) as any,
        defaultValues: {
            title: "",
            summary: "",
            overview: "",
            problemStatement: "",
            tags: "",
            difficulty: "intermediate",
            prize: "",
            deadlineDays: 30,
            dataPackUrl: "",
            templateRepoUrl: "",
            testRunCommand: "",
            rubricCriteria: [],
        },
    })

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "rubricCriteria",
    })

    async function onSubmit(values: FormValues) {
        try {
            const tags = values.tags.split(",").map((t) => t.trim()).filter(Boolean)
            const deadline = Date.now() + values.deadlineDays * 24 * 60 * 60 * 1000
            const rubricCriteria = values.rubricCriteria.length > 0 ? values.rubricCriteria : undefined
            const dataPackUrl = values.dataPackUrl || undefined
            const assignedJudges = selectedJudges.length > 0 ? selectedJudges : undefined
            const templateRepoUrl = values.templateRepoUrl || undefined
            const testRunCommand = values.testRunCommand || undefined

            // Upload hidden test files to Convex storage
            let hiddenTestFileIds: Id<"_storage">[] | undefined
            if (hiddenTestFiles.length > 0) {
                hiddenTestFileIds = []
                for (const file of hiddenTestFiles) {
                    const uploadUrl = await generateUploadUrl()
                    const res = await fetch(uploadUrl, {
                        method: "POST",
                        headers: { "Content-Type": file.type },
                        body: file,
                    })
                    const { storageId } = await res.json()
                    hiddenTestFileIds.push(storageId)
                }
            }

            await createChallenge({
                ...values,
                deadline,
                tags,
                rubricCriteria,
                dataPackUrl,
                assignedJudges,
                templateRepoUrl,
                hiddenTestFileIds,
                testRunCommand,
            })
            toast.success("Challenge created!")
            router.push("/sponsor")
        } catch (err) {
            toast.error("Error", { description: String(err) })
        }
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <h1 className="font-display text-3xl font-bold">Create Challenge</h1>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField control={form.control} name="title" render={({ field }) => (
                        <FormItem><FormLabel>Title *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="summary" render={({ field }) => (
                        <FormItem><FormLabel>Summary *</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="overview" render={({ field }) => (
                        <FormItem><FormLabel>Overview *</FormLabel><FormControl><Textarea rows={4} {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="problemStatement" render={({ field }) => (
                        <FormItem><FormLabel>Problem Statement * (shown to authenticated users only)</FormLabel><FormControl><Textarea rows={6} {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="difficulty" render={({ field }) => (
                            <FormItem><FormLabel>Difficulty</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="beginner">Beginner</SelectItem>
                                        <SelectItem value="intermediate">Intermediate</SelectItem>
                                        <SelectItem value="advanced">Advanced</SelectItem>
                                        <SelectItem value="expert">Expert</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="deadlineDays" render={({ field }) => (
                            <FormItem><FormLabel>Deadline (days from now)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </div>
                    <FormField control={form.control} name="prize" render={({ field }) => (
                        <FormItem><FormLabel>Prize</FormLabel><FormControl><Input placeholder="$2,000 + Badge" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="dataPackUrl" render={({ field }) => (
                        <FormItem><FormLabel>Data Pack URL (optional)</FormLabel><FormControl><Input placeholder="https://example.com/data-pack.zip" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />

                    {/* ── Standardized Testing Section ── */}
                    <div className="space-y-4 rounded-lg border p-5 bg-muted/30">
                        <div>
                            <h2 className="font-display text-lg font-semibold flex items-center gap-2">
                                <Info className="h-5 w-5 text-brand-primary" />
                                Standardized Testing (optional)
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                Provide a template repository so every candidate starts from the same codebase.
                                You control what candidates see (visible tests) and what stays secret (hidden tests).
                            </p>
                        </div>

                        {/* Example template repo link */}
                        <a
                            href="https://github.com/yogi100x/elitebuilders-challenge-template"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 rounded-md border border-blue-200 bg-blue-50 p-4 hover:bg-blue-100 transition-colors dark:border-blue-900 dark:bg-blue-950/40 dark:hover:bg-blue-950/60"
                        >
                            <Github className="h-8 w-8 text-blue-600 dark:text-blue-400 shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                                    Clone our example template to get started
                                </p>
                                <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                                    A complete working example with visible tests, hidden tests, reference solution,
                                    and the exact folder structure you need. Clone it, customize for your challenge, and publish.
                                </p>
                            </div>
                            <ExternalLink className="h-4 w-4 text-blue-400 dark:text-blue-500 shrink-0" />
                        </a>

                        {/* How it works — security model */}
                        <div className="rounded-md border bg-background p-4 space-y-3">
                            <p className="text-sm font-semibold">How visible vs. hidden tests work</p>
                            <div className="grid sm:grid-cols-2 gap-3">
                                <div className="rounded border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/40 p-3">
                                    <p className="text-xs font-bold text-green-800 dark:text-green-300 uppercase tracking-wide mb-1">Visible Tests — in your GitHub repo</p>
                                    <ul className="text-xs text-green-700 dark:text-green-400 space-y-1 list-disc pl-4">
                                        <li>Live in the template repo candidates fork</li>
                                        <li>Candidates can read, run, and debug against them locally</li>
                                        <li>Use these for basic sanity checks and to show expected interfaces</li>
                                    </ul>
                                </div>
                                <div className="rounded border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40 p-3">
                                    <p className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wide mb-1">Hidden Tests — uploaded here</p>
                                    <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-1 list-disc pl-4">
                                        <li>Stored on our server — <strong>never</strong> exposed to candidates</li>
                                        <li>Injected into a secure sandbox only during automated scoring</li>
                                        <li>Use these for edge cases, performance checks, and anti-cheat validation</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* Step-by-step setup guide */}
                        <div className="rounded-md border bg-background p-4 space-y-4">
                            <p className="text-sm font-semibold">Step-by-step: Setting up your template repository</p>

                            {/* Step 1 */}
                            <div className="space-y-2">
                                <p className="text-sm font-medium">Step 1 — Create the GitHub repo</p>
                                <ol className="text-xs text-muted-foreground space-y-1 list-decimal pl-5">
                                    <li>Create a <strong>new public repository</strong> on GitHub (e.g., <code className="bg-muted px-1 rounded">your-org/challenge-api-design</code>)</li>
                                    <li>Go to Settings → check <strong>&quot;Template repository&quot;</strong> — this lets candidates click &quot;Use this template&quot; instead of forking</li>
                                    <li>Add a clear <code className="bg-muted px-1 rounded">README.md</code> explaining the challenge, setup steps, and what candidates need to implement</li>
                                </ol>
                            </div>

                            {/* Step 2 */}
                            <div className="space-y-2">
                                <p className="text-sm font-medium">Step 2 — Set up the project structure</p>
                                <p className="text-xs text-muted-foreground">
                                    Your repo should follow this exact structure. Candidates will implement their solution in <code className="bg-muted px-1 rounded">src/</code> and can verify locally with the visible tests.
                                </p>
                                <pre className="bg-muted rounded-md p-3 text-xs font-mono overflow-x-auto leading-relaxed">{`your-challenge-template/
│
├── README.md                    # Challenge brief, rules, setup instructions
├── package.json                 # Must include a "test" script (see Step 3)
├── tsconfig.json                # TypeScript config (if using TS)
│
├── src/
│   ├── index.ts                 # Entry point — export functions/classes
│   │                            #   candidates must implement
│   ├── types.ts                 # Shared type definitions / interfaces
│   └── utils.ts                 # Any helper code you provide
│
├── __tests__/
│   ├── basic.test.ts            # VISIBLE — basic functionality tests
│   ├── edge-cases.test.ts       # VISIBLE — edge case tests
│   └── example.test.ts          # VISIBLE — example showing expected I/O
│
│   # NOTE: Do NOT create __tests__/hidden/ in the repo.
│   # Hidden tests are uploaded separately via this form
│   # and injected automatically during scoring.
│
└── .gitignore                   # node_modules, dist, etc.`}</pre>
                            </div>

                            {/* Step 3 */}
                            <div className="space-y-2">
                                <p className="text-sm font-medium">Step 3 — Configure package.json</p>
                                <p className="text-xs text-muted-foreground">
                                    The <code className="bg-muted px-1 rounded">test</code> script is what runs in our scoring sandbox. Make sure it works with <code className="bg-muted px-1 rounded">npm install &amp;&amp; npm test</code>.
                                </p>
                                <pre className="bg-muted rounded-md p-3 text-xs font-mono overflow-x-auto leading-relaxed">{`{
  "name": "challenge-api-design",
  "scripts": {
    "test": "jest --verbose --forceExit",
    "test:watch": "jest --watch"
  },
  "devDependencies": {
    "jest": "^29.0.0",
    "ts-jest": "^29.0.0",
    "@types/jest": "^29.0.0",
    "typescript": "^5.0.0"
  }
}`}</pre>
                                <p className="text-xs text-muted-foreground italic">
                                    Vitest works too — just change the test script to <code className="bg-muted px-1 rounded">&quot;test&quot;: &quot;vitest run&quot;</code> and update the &quot;Test Run Command&quot; field below.
                                </p>
                            </div>

                            {/* Step 4 */}
                            <div className="space-y-2">
                                <p className="text-sm font-medium">Step 4 — Write visible tests</p>
                                <p className="text-xs text-muted-foreground">
                                    These go in the repo. They help candidates understand the expected interface and verify their solution works. Example:
                                </p>
                                <pre className="bg-muted rounded-md p-3 text-xs font-mono overflow-x-auto leading-relaxed">{`// __tests__/basic.test.ts
import { createUser, getUser } from '../src/index';

describe('User API - Basic', () => {
  test('should create a user and return an id', () => {
    const user = createUser({ name: 'Alice', email: 'a@b.com' });
    expect(user).toHaveProperty('id');
    expect(user.name).toBe('Alice');
  });

  test('should retrieve a user by id', () => {
    const created = createUser({ name: 'Bob', email: 'b@c.com' });
    const found = getUser(created.id);
    expect(found).toEqual(created);
  });
});`}</pre>
                            </div>

                            {/* Step 5 */}
                            <div className="space-y-2">
                                <p className="text-sm font-medium">Step 5 — Write hidden tests (uploaded below)</p>
                                <p className="text-xs text-muted-foreground">
                                    Create separate test files on your machine. These are <strong>never</strong> pushed to GitHub — you upload them via the form below.
                                    They test edge cases, error handling, and requirements that candidates shouldn&apos;t see in advance.
                                </p>
                                <pre className="bg-muted rounded-md p-3 text-xs font-mono overflow-x-auto leading-relaxed">{`// hidden_validation.test.ts  (upload this file below)
import { createUser, getUser, deleteUser } from '../src/index';

describe('User API - Hidden Validation', () => {
  test('should reject duplicate emails', () => {
    createUser({ name: 'A', email: 'dup@test.com' });
    expect(() => createUser({ name: 'B', email: 'dup@test.com' }))
      .toThrow();
  });

  test('should return null for non-existent user', () => {
    expect(getUser('non-existent-id')).toBeNull();
  });

  test('should handle deletion correctly', () => {
    const user = createUser({ name: 'C', email: 'c@test.com' });
    deleteUser(user.id);
    expect(getUser(user.id)).toBeNull();
  });
});`}</pre>
                                <p className="text-xs text-muted-foreground">
                                    <strong>Important:</strong> Hidden tests import from the <em>same paths</em> as visible tests
                                    (e.g., <code className="bg-muted px-1 rounded">../src/index</code>). They run in the same project directory —
                                    they just live in <code className="bg-muted px-1 rounded">__tests__/hidden/</code> instead of <code className="bg-muted px-1 rounded">__tests__/</code>.
                                </p>
                            </div>

                            {/* Step 6 */}
                            <div className="space-y-2">
                                <p className="text-sm font-medium">Step 6 — Verify everything works</p>
                                <ol className="text-xs text-muted-foreground space-y-1 list-decimal pl-5">
                                    <li>Clone your template repo locally: <code className="bg-muted px-1 rounded">git clone &amp;&amp; npm install &amp;&amp; npm test</code> — all visible tests should pass</li>
                                    <li>Copy your hidden test files into <code className="bg-muted px-1 rounded">__tests__/hidden/</code> locally and run <code className="bg-muted px-1 rounded">npm test</code> again — hidden tests should also pass against your reference implementation</li>
                                    <li>Remove <code className="bg-muted px-1 rounded">__tests__/hidden/</code> before pushing (it should NOT be in the repo)</li>
                                    <li>Delete or stub out your reference implementation in <code className="bg-muted px-1 rounded">src/</code> so candidates start with the expected interface but empty functions</li>
                                </ol>
                            </div>
                        </div>

                        {/* Checklist */}
                        <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground space-y-1">
                            <p className="font-semibold text-foreground">Pre-publish checklist</p>
                            <ul className="space-y-0.5">
                                <li>[ ] Template repo is public and marked as &quot;Template repository&quot; in GitHub settings</li>
                                <li>[ ] <code className="bg-muted px-1 rounded">npm install &amp;&amp; npm test</code> works in a clean clone</li>
                                <li>[ ] Visible tests pass against your reference solution</li>
                                <li>[ ] Hidden tests pass locally when placed in <code className="bg-muted px-1 rounded">__tests__/hidden/</code></li>
                                <li>[ ] Hidden test files are NOT committed to the repo</li>
                                <li>[ ] <code className="bg-muted px-1 rounded">src/</code> has stub implementations (empty function bodies) for candidates to fill in</li>
                                <li>[ ] README explains setup, what to implement, and how to run visible tests</li>
                            </ul>
                        </div>

                        {/* Form fields — template repo, test command, hidden files */}
                        <div className="space-y-4 pt-2 border-t">
                            <FormField control={form.control} name="templateRepoUrl" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Template Repository URL</FormLabel>
                                    <FormControl>
                                        <Input placeholder="https://github.com/your-org/challenge-api-design" {...field} />
                                    </FormControl>
                                    <p className="text-xs text-muted-foreground">
                                        The public GitHub repo candidates will fork/clone. Must contain visible tests and stub implementations.
                                    </p>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <FormField control={form.control} name="testRunCommand" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Test Run Command</FormLabel>
                                    <FormControl>
                                        <Input placeholder="npm test" {...field} />
                                    </FormControl>
                                    <p className="text-xs text-muted-foreground">
                                        The command our sandbox runs to execute tests. Defaults to <code className="bg-muted px-1 rounded">npm test</code>. Use <code className="bg-muted px-1 rounded">npx vitest run</code> for Vitest, <code className="bg-muted px-1 rounded">npx jest --forceExit</code> for Jest, etc.
                                    </p>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Hidden Test Files</label>
                                <p className="text-xs text-muted-foreground mb-2">
                                    Upload your secret test files here. These are stored on our server and injected into
                                    <code className="bg-muted px-1 rounded ml-1">__tests__/hidden/</code> during automated scoring.
                                    Candidates cannot see or download these files.
                                </p>
                                <Input
                                    type="file"
                                    multiple
                                    accept=".js,.ts,.jsx,.tsx"
                                    onChange={(e) => {
                                        if (e.target.files) {
                                            setHiddenTestFiles(Array.from(e.target.files))
                                        }
                                    }}
                                />
                                {hiddenTestFiles.length > 0 && (
                                    <div className="rounded border bg-muted/50 p-2">
                                        <p className="text-xs font-medium">{hiddenTestFiles.length} hidden test file(s) selected:</p>
                                        <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                                            {hiddenTestFiles.map((f, i) => (
                                                <li key={i} className="font-mono">{f.name} ({(f.size / 1024).toFixed(1)} KB)</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <FormField control={form.control} name="tags" render={({ field }) => (
                        <FormItem><FormLabel>Tags (comma-separated)</FormLabel><FormControl><Input placeholder="AI, developer-tools, LLM" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />

                    {/* Rubric Builder */}
                    <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="font-display text-lg font-semibold">Custom Rubric Criteria</h2>
                                <p className="text-sm text-muted-foreground">
                                    Define how submissions will be scored. Leave empty to use the default rubric.
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => append({ name: "", maxScore: 20, description: "" })}
                            >
                                <Plus className="h-4 w-4 mr-1" />
                                Add Criterion
                            </Button>
                        </div>

                        {fields.length === 0 && (
                            <p className="text-sm text-muted-foreground italic">
                                No custom criteria defined. The default 5-criterion rubric (Technical Implementation, Problem Understanding, Innovation, Documentation, Completeness) will be used.
                            </p>
                        )}

                        {fields.map((field, index) => (
                            <Card key={field.id}>
                                <CardContent className="pt-4 space-y-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="grid grid-cols-[1fr_100px] gap-3 flex-1">
                                            <FormField control={form.control} name={`rubricCriteria.${index}.name`} render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Criterion Name</FormLabel>
                                                    <FormControl><Input placeholder="e.g. Technical Implementation" {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                            <FormField control={form.control} name={`rubricCriteria.${index}.maxScore`} render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Max Score</FormLabel>
                                                    <FormControl><Input type="number" placeholder="20" {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="mt-6 text-destructive hover:text-destructive"
                                            onClick={() => remove(index)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <FormField control={form.control} name={`rubricCriteria.${index}.description`} render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Description</FormLabel>
                                            <FormControl><Textarea rows={2} placeholder="What should the judge look for?" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Judge Assignment */}
                    {judges && judges.length > 0 && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Assign Judges (Optional)</label>
                            <div className="space-y-1">
                                {judges.map((judge) => (
                                    <label key={judge._id} className="flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={selectedJudges.includes(judge._id)}
                                            onChange={(e) => {
                                                setSelectedJudges((prev) =>
                                                    e.target.checked
                                                        ? [...prev, judge._id]
                                                        : prev.filter((id) => id !== judge._id),
                                                )
                                            }}
                                        />
                                        {judge.name} ({judge.email})
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    <Button type="submit" className="w-full">Create Challenge</Button>
                </form>
            </Form>
        </div>
    )
}
