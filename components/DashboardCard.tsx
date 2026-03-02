"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const CARD_MIN_HEIGHT = "min-h-[18rem]";

export interface DashboardCardProps {
  title: string;
  description: string;
  children: React.ReactNode;
  /** Image affichée en bas à droite (layout avec contenu max 70% de largeur). */
  iconSrc?: string;
  /** Taille de l'icône (width/height en px). Défaut 230. */
  iconSize?: number;
  /** Lien en bas à gauche du contenu (style vert Horizon). */
  linkHref?: string;
  linkLabel?: string;
  /** Élément optionnel dans le header (ex. lien en haut à droite). */
  headerAction?: React.ReactNode;
  /** Applique opacity-75 à la carte. */
  dimmed?: boolean;
  /** Classes additionnelles sur la Card. */
  className?: string;
}

/**
 * Carte réutilisable du dashboard : même hauteur, option icône décorative,
 * lien vert en bas, ou action dans le header.
 */
export function DashboardCard({
  title,
  description,
  children,
  iconSrc,
  iconSize = 230,
  linkHref,
  linkLabel,
  headerAction,
  dimmed,
  className,
}: DashboardCardProps) {
  const cardClass = [
    "relative",
    CARD_MIN_HEIGHT,
    iconSrc && "overflow-visible",
    dimmed && "opacity-75",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      {children}
      {linkHref && linkLabel && (
        <Link
          href={linkHref}
          className="mt-4 flex w-fit items-center gap-1 text-sm font-medium text-horizon-primary transition-colors hover:text-horizon-primary-hover"
        >
          {linkLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </>
  );

  const header = (
    <CardHeader className="pb-2">
      <div
        className={headerAction ? "flex items-start justify-between gap-2" : ""}
      >
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        {headerAction}
      </div>
    </CardHeader>
  );

  const body = <CardContent>{content}</CardContent>;

  const cardInner = iconSrc ? (
    <>
      <div className="relative z-10 max-w-[62%]">
        {header}
        {body}
      </div>
      <div
        className="pointer-events-none absolute bottom-0 right-0 z-0"
        style={{ right: -20, bottom: -20 }}
        aria-hidden
      >
        <Image
          src={iconSrc}
          alt=""
          width={iconSize}
          height={iconSize}
          className="object-contain"
        />
      </div>
    </>
  ) : (
    <>
      {header}
      {body}
    </>
  );

  const card = <Card className={cardClass}>{cardInner}</Card>;

  if (iconSrc) {
    return <div className={`${CARD_MIN_HEIGHT} overflow-visible`}>{card}</div>;
  }

  return card;
}
