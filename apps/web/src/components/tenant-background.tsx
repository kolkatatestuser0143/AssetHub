'use client';

export default function TenantBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      <svg
        viewBox="0 0 1200 900"
        preserveAspectRatio="xMidYMid slice"
        className="absolute -right-24 bottom-0 h-[78%] w-[78%] max-w-[980px] text-[var(--theme-link)] opacity-[0.055]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M640 700 790 610 950 700 800 792 640 700Z" />
          <path d="M790 610v182M950 700v95L800 885l-160-93v-92" />
          <path d="M790 610 800 520 960 612 950 700" />
          <path d="M800 520 950 612 1090 530 930 438 800 520Z" />
          <path d="M930 438v-94l160 92v94" />
          <path d="M800 520v94l130 74" />
          <path d="M930 438 800 364 640 456 800 548" />
          <path d="M640 456v92" />
          <path d="M640 456 510 532 670 625 800 548" />
          <path d="M670 625v92" />
          <path d="M510 532v92l160 93" />
          <path d="M670 717 800 792" />
          <path d="M510 532 385 460" />
          <path d="M385 460 385 370 545 462 545 553" />
          <path d="M385 370 545 462 680 384 520 292 385 370Z" />
          <path d="M520 292v-88l160 92v88" />
          <path d="M545 462 680 384" />
        </g>
        <g fill="currentColor" opacity="0.3">
          <circle cx="385" cy="370" r="5" />
          <circle cx="545" cy="462" r="5" />
          <circle cx="640" cy="456" r="5" />
          <circle cx="790" cy="610" r="5" />
          <circle cx="950" cy="700" r="5" />
          <circle cx="1090" cy="530" r="5" />
        </g>
      </svg>
      <div className="absolute -right-32 bottom-[-12rem] h-[26rem] w-[26rem] rounded-full bg-[var(--theme-primary)] opacity-[0.035] blur-3xl" />
    </div>
  );
}
