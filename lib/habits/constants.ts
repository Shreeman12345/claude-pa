export const HABITS = ["Gym", "Diet", "HairSkin", "MealPrep", "Journaling"] as const;
export type Habit = (typeof HABITS)[number];

export const HABIT_LABEL: Record<Habit, string> = {
  Gym: "Gym",
  Diet: "Diet",
  HairSkin: "Hair/Skin",
  MealPrep: "Meal Prep",
  Journaling: "Journaling",
};
