import { DEFAULT_LOCALE, TIMEZONE, getSGDateString, MS_PER_DAY } from '../../utils/constants';
import { parseUTCTimestamp } from './utils';

export default function DateDivider({ date }) {
  const todaySG = getSGDateString();
  const yesterdaySG = getSGDateString(new Date(Date.now() - MS_PER_DAY));
  const msgDateSG = getSGDateString(parseUTCTimestamp(date));

  let label;
  if (msgDateSG === todaySG) label = 'Today';
  else if (msgDateSG === yesterdaySG) label = 'Yesterday';
  else label = parseUTCTimestamp(date).toLocaleDateString(DEFAULT_LOCALE, { day: 'numeric', month: 'short', year: 'numeric', timeZone: TIMEZONE });

  return (
    <div className="flex items-center justify-center my-4">
      <span className="px-3 py-1 rounded-full bg-white/[0.05] text-white/40 text-xs border border-white/[0.05]">
        {label}
      </span>
    </div>
  );
}
