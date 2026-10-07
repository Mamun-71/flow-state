import type { Metadata } from "next";
import { CategoryManager } from "@/components/category-manager";
import { PageHeader } from "@/components/page-header";
import { CategoriesIcon } from "@/components/icons";
import { getCategories, getCategoryUsage } from "@/lib/data";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const [categories, usage] = await Promise.all([getCategories(), getCategoryUsage()]);
  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <PageHeader
        icon={<CategoriesIcon className="size-6.5" />}
        title="Categories"
        description="Group tasks so you can see where your hours go."
      />
      <CategoryManager categories={categories} usage={usage} />
    </div>
  );
}
