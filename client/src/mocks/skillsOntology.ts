export interface OntologyEntry {
  skill: string;
  keywords: string[];
  category: "language" | "framework" | "platform" | "process" | "domain";
}

export const SKILLS_ONTOLOGY: OntologyEntry[] = [
  { skill: "React",            keywords: ["react", "jsx", "hooks", "redux", "next.js", "nextjs"], category: "framework" },
  { skill: "TypeScript",       keywords: ["typescript", "ts", "type-safe", "tsx"], category: "language" },
  { skill: "Node.js",          keywords: ["node", "node.js", "express", "nestjs", "nest.js"], category: "framework" },
  { skill: "Python",           keywords: ["python", "django", "flask", "fastapi"], category: "language" },
  { skill: "Java",             keywords: ["java", "spring", "spring boot", "jvm"], category: "language" },
  { skill: "AWS",              keywords: ["aws", "amazon web services", "s3", "ec2", "lambda", "ecs", "rds"], category: "platform" },
  { skill: "GCP",              keywords: ["gcp", "google cloud", "bigquery", "gke"], category: "platform" },
  { skill: "Kubernetes",       keywords: ["kubernetes", "k8s", "helm", "kubectl"], category: "platform" },
  { skill: "Docker",           keywords: ["docker", "container", "containerized"], category: "platform" },
  { skill: "PostgreSQL",       keywords: ["postgres", "postgresql", "sql", "rds"], category: "platform" },
  { skill: "System Design",    keywords: ["system design", "architecture", "scalability", "distributed", "microservices"], category: "domain" },
  { skill: "Agile Management", keywords: ["agile", "scrum", "sprint", "kanban", "ceremonies"], category: "process" },
  { skill: "Mentorship",       keywords: ["mentor", "mentorship", "coached", "guided", "junior engineers"], category: "process" },
  { skill: "Code Review",      keywords: ["code review", "reviewing", "pr review"], category: "process" },
  { skill: "GraphQL",          keywords: ["graphql", "apollo", "subgraph"], category: "framework" },
  { skill: "Machine Learning", keywords: ["ml", "machine learning", "tensorflow", "pytorch", "model"], category: "domain" },
  { skill: "Data Engineering", keywords: ["airflow", "spark", "data pipeline", "etl"], category: "domain" },
  { skill: "Security",         keywords: ["security", "owasp", "infosec", "auth", "encryption"], category: "domain" },
];

export const extractSkills = (text: string): string[] => {
  const lower = text.toLowerCase();
  const found = new Set<string>();
  for (const entry of SKILLS_ONTOLOGY) {
    if (entry.keywords.some((kw) => lower.includes(kw))) found.add(entry.skill);
  }
  return Array.from(found);
};
