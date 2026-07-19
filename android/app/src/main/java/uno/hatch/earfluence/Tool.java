package uno.hatch.earfluence;

import androidx.annotation.StringRes;

/** The tools offered on the hub screen, in the order they are listed. */
public enum Tool {
	PITCH_MATCH("pitch-match.html", R.string.pitch_match),
	CHORD_MATCH("chord-match.html", R.string.chord_match),
	SIGHT_SING("sight-sing.html", R.string.sight_sing),
	CHORD_PROGRESSION("chord-progression.html", R.string.chord_progression);

	final String page;

	@StringRes
	final int label;

	Tool(String page, @StringRes int label) {
		this.page = page;
		this.label = label;
	}
}
