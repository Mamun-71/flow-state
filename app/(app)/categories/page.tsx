import type { Metadata } from "next";
import { CategoryManager } from "@/components/category-manager";
import { getCategories, getCategoryUsage } from "@/lib/data";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const [categories, usage] = await Promise.all([getCategories(), getCategoryUsage()]);
  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Categories</h1>
        <p className="mt-1 text-sm text-muted-foreground">Group tasks so you can see where your hours go.</p>
      </div>
      <CategoryManager categories={categories} usage={usage} />
    </div>
  );
}
