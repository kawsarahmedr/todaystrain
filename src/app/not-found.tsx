import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container-page py-16">
      <p className="text-brand-700 text-sm font-semibold">৪০৪</p>
      <h1 className="mt-2 text-2xl font-bold sm:text-3xl">পাতাটি খুঁজে পাওয়া যায়নি</h1>
      <p className="mt-4 max-w-2xl text-lg text-slate-700">
        যে ঠিকানায় এসেছেন, সেখানে কোনো পাতা নেই। হয়তো লিংকটি পুরোনো, অথবা ঠিকানায় টাইপের ভুল আছে।
        নিচের লিংকগুলো থেকে আপনার দরকারি তথ্য খুঁজে নিতে পারেন।
      </p>
      <ul className="mt-6 flex flex-wrap gap-3">
        {[
          ['/', 'হোমপেজ'],
          ['/trains/', 'সব ট্রেন'],
          ['/routes/', 'জনপ্রিয় রুট'],
          ['/stations/', 'স্টেশন'],
          ['/today/', 'আজকের ট্রেন'],
          ['/guides/', 'গাইড'],
        ].map(([href, label]) => (
          <li key={href}>
            <Link
              href={href!}
              className="btn hover:border-brand-400 border border-slate-300 bg-white text-slate-800"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
