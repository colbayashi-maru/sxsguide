import { experienceBetween, formatDuration, formatNumber } from '../lib/compute';
import type { ScoreBand, SeasonScoring } from '../lib/types';
import { Panel, Stat } from '../components/ui';

export interface ImproveProps {
  season: SeasonScoring;
  /** Levels the player entered for each progression category, by label. */
  progressionLevels: Record<string, number>;
  /** Scores the player entered for each gameplay component, by label. */
  gameplayScores: Record<string, number>;
  total: number;
  band: ScoreBand | null;
  nextBand: ScoreBand | undefined;
  expPerHour: number | null;
}

/**
 * Turns the season score into advice about what to raise next.
 *
 * Two things are computable from the workbook and one is not, and the panel
 * keeps them apart. Points per level and the gap to the next grade are exact.
 * The experience cost of a character level is exact too, because the experience
 * table covers every level. What the workbook never says is what a skill, gear,
 * fantomon or relic level costs to raise -- so those are ranked by rate only,
 * and the panel says so rather than implying the ranking is a plan.
 */
export default function Improve({
  season, progressionLevels, gameplayScores, total, band, nextBand, expPerHour,
}: ImproveProps) {
  const gap = nextBand ? nextBand.min - total : 0;

  const characterRule = season.progression.find((p) =>
    p.label.toLowerCase().includes('character'));
  const characterThreshold = characterRule?.threshold ?? 0;
  // The calculator collects levels earned past the season threshold, so the
  // player's actual character level is the threshold plus what they entered.
  const characterLevel = characterThreshold
    + (progressionLevels[characterRule?.label ?? ''] || 0);

  // What one more character level costs right now, and what it buys.
  const nextLevelExp = experienceBetween(characterLevel, characterLevel + 1);
  const pointsPerCharacterLevel = characterRule?.perLevel ?? 0;
  const expPerPoint = nextLevelExp !== null && pointsPerCharacterLevel > 0
    ? nextLevelExp / pointsPerCharacterLevel
    : null;
  const hoursPerPoint = expPerPoint !== null && expPerHour ? expPerPoint / expPerHour : null;

  const routes = season.progression
    .map((rule) => {
      const levelsNeeded = gap > 0 ? Math.ceil(gap / rule.perLevel) : 0;
      const isCharacter = rule === characterRule;
      const cost = isCharacter && levelsNeeded > 0
        ? experienceBetween(characterLevel, characterLevel + levelsNeeded)
        : null;
      return {
        rule,
        levelsNeeded,
        isCharacter,
        cost,
        hours: cost !== null && expPerHour ? cost / expPerHour : null,
      };
    })
    .sort((a, b) => b.rule.perLevel - a.rule.perLevel);

  const unclaimed = season.gameplay.filter((label) => !(gameplayScores[label] > 0));
  const gameplayTotal = season.gameplay.reduce((t, l) => t + (gameplayScores[l] || 0), 0);

  return (
    <>
      <Panel
        title="What to improve next"
        note={nextBand
          ? `${formatNumber(gap)} points from ${band?.grade ?? 'your current grade'} to ${nextBand.grade}`
          : 'You are in the top band for this season'}
      >
        {unclaimed.length > 0 ? (
          <div className="notice" style={{ borderLeftColor: 'var(--gold)' }}>
            <b>Start here: {unclaimed.length} gameplay {unclaimed.length === 1 ? 'entry is' : 'entries are'} empty.</b>
            <p style={{ margin: '6px 0 0' }}>
              {unclaimed.join(', ')}. These are placement and participation scores,
              not levels — they cost no experience at all. Every other route below
              means grinding.
            </p>
          </div>
        ) : (
          <div className="notice">
            All {season.gameplay.length} gameplay entries are filled in, totalling{' '}
            {formatNumber(gameplayTotal)} points. The routes below are the levelling ones.
          </div>
        )}

        {nextBand && (
          <>
            <h3 className="dim" style={{ marginTop: 18 }}>
              Closing the {formatNumber(gap)}-point gap with one category alone
            </h3>
            <div className="table-wrap" style={{ marginTop: 8 }}>
              <table>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th className="num">Points / level</th>
                    <th className="num">Levels needed</th>
                    <th className="num">Experience</th>
                    <th className="num">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {routes.map(({ rule, levelsNeeded, isCharacter, cost, hours }) => (
                    <tr key={rule.label}>
                      <td>{rule.label}</td>
                      <td className="num">{rule.perLevel}</td>
                      <td className="num">{formatNumber(levelsNeeded)}</td>
                      <td className="num">
                        {isCharacter
                          ? (cost === null ? 'off the table' : formatNumber(cost))
                          : <span className="dim">not published</span>}
                      </td>
                      <td className="num">
                        {isCharacter && hours !== null
                          ? formatDuration(hours)
                          : <span className="dim">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Panel>

      <Panel
        title="What a character level actually costs"
        note={`At level ${formatNumber(characterLevel)}, from the season threshold of ${characterThreshold}`}
      >
        <div className="grid cols-3">
          <Stat
            label="Next level"
            value={nextLevelExp === null ? '—' : formatNumber(nextLevelExp)}
            sub="experience"
          />
          <Stat
            label="Cost per point"
            value={expPerPoint === null ? '—' : formatNumber(expPerPoint)}
            sub={`experience, at ${pointsPerCharacterLevel} points a level`}
          />
          <Stat
            label="Time per point"
            value={hoursPerPoint === null ? '—' : formatDuration(hoursPerPoint)}
            sub={expPerHour ? 'at your experience rate' : 'set your rate on Setup'}
          />
        </div>
        <p className="dim" style={{ marginBottom: 0 }}>
          Character levels pay {pointsPerCharacterLevel} points each — the highest rate
          of any category — but the experience curve is brutal: a point costs roughly
          235,000 experience at level 131 and 100,000,000 at level 240. Read the rate
          and this cost together, never the rate alone.
        </p>
      </Panel>

      <Panel title="What this cannot tell you">
        <p className="muted" style={{ marginTop: 0 }}>
          The workbook prices a character level exactly, through the experience
          table, so those rows above are real numbers. It never says what raising a
          skill, gear, fantomon or relic level costs — no materials, no drop rates,
          no time. Those categories are ranked by points per level only, which is
          what each is <em>worth</em>, not what it takes.
        </p>
        <p className="muted" style={{ marginBottom: 0 }}>
          That matters because the ladders are different lengths: this season pays
          for relic levels above {season.progression.find((p) => p.label.toLowerCase().includes('relic'))?.threshold ?? '—'} but
          character levels only above {characterThreshold}. A cheap relic level can
          easily beat an expensive character level even at a third of the rate. If
          you can tell me what a level costs in each category, this becomes a real
          ranking instead of a rate table.
        </p>
      </Panel>
    </>
  );
}
