"use client";

/**
 * Desk Ideas is hidden (MEMBERS_DESK_IDEAS, default OFF). Loading it through next/dynamic keeps its
 * code + copy in a separate chunk, so it is not in the /members first load while the flag is off.
 * Still server-rendered when the flag is on.
 */
import dynamic from "next/dynamic";

export const DeskIdeasLazy = dynamic(() => import("./DeskIdeas").then((m) => m.DeskIdeas));
