package uno.hatch.earfluence;

import android.annotation.SuppressLint;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.TypedValue;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ScrollView;

import androidx.activity.ComponentActivity;
import androidx.activity.OnBackPressedCallback;
import androidx.webkit.WebSettingsCompat;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewFeature;

import java.util.EnumMap;
import java.util.Map;

/**
 * The whole app: a hub screen listing the tools, plus one WebView per tool.
 *
 * <p>All tools live in this single activity, and a tool's WebView is created
 * on first use and then kept for the life of the activity.  Switching tools
 * only changes which WebView is visible, so tools the user has navigated away
 * from keep running and keep sounding.  That is the point of the design: the
 * tools are expected to play at the same time, the way browser tabs would.
 *
 * <p>Because everything is in one foreground activity, the app is never
 * backgrounded while tools are playing, so background timer throttling does
 * not come into it.
 */
public class MainActivity extends ComponentActivity {

	/**
	 * Assets are served over https rather than file:// because file:// is not
	 * a secure context, which would silently disable the Screen Wake Lock API
	 * the tools rely on.
	 */
	private static final String ASSET_ORIGIN = "https://appassets.androidplatform.net/assets/";

	private FrameLayout container;
	private View hub;
	private WebViewAssetLoader assetLoader;
	private final Map<Tool, WebView> liveTools = new EnumMap<>(Tool.class);

	@Override
	protected void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);

		assetLoader = new WebViewAssetLoader.Builder()
				.addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
				.build();

		container = new FrameLayout(this);
		hub = buildHub();
		container.addView(hub);
		setContentView(container);

		// Back returns to the hub from a tool, leaving that tool playing.
		// Registered through the dispatcher rather than by overriding
		// onBackPressed(), which the predictive back gesture no longer calls
		// at this targetSdk.
		getOnBackPressedDispatcher().addCallback(this,
				new OnBackPressedCallback(true) {
					@Override
					public void handleOnBackPressed() {
						if (hub.getVisibility() == View.VISIBLE) {
							setEnabled(false);
							getOnBackPressedDispatcher().onBackPressed();
						} else {
							showHub();
						}
					}
				});
	}

	private View buildHub() {
		LinearLayout column = new LinearLayout(this);
		column.setOrientation(LinearLayout.VERTICAL);
		int pad = dp(16);
		column.setPadding(pad, pad, pad, pad);

		for (final Tool tool : Tool.values()) {
			Button button = new Button(this);
			button.setText(tool.label);
			button.setOnClickListener(v -> showTool(tool));
			column.addView(button, wrapHeight(dp(8)));
		}

		Button stopAll = new Button(this);
		stopAll.setText(R.string.stop_all);
		stopAll.setOnClickListener(v -> stopAllTools());
		column.addView(stopAll, wrapHeight(dp(32)));

		ScrollView scroller = new ScrollView(this);
		scroller.addView(column);
		return scroller;
	}

	private LinearLayout.LayoutParams wrapHeight(int topMargin) {
		LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
				ViewGroup.LayoutParams.MATCH_PARENT,
				ViewGroup.LayoutParams.WRAP_CONTENT);
		params.topMargin = topMargin;
		return params;
	}

	private int dp(int value) {
		return Math.round(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP,
				value, getResources().getDisplayMetrics()));
	}

	private void showTool(Tool tool) {
		WebView webView = liveTools.get(tool);
		if (webView == null) {
			webView = createToolWebView();
			liveTools.put(tool, webView);
			container.addView(webView);
			webView.loadUrl(ASSET_ORIGIN + tool.page);
		}
		setTitle(tool.label);
		hub.setVisibility(View.GONE);
		for (Map.Entry<Tool, WebView> entry : liveTools.entrySet()) {
			// GONE rather than detached or paused: a hidden WebView keeps
			// running, which is what lets a tool go on playing while another
			// tool is on screen.
			entry.getValue().setVisibility(
					entry.getKey() == tool ? View.VISIBLE : View.GONE);
		}
	}

	private void showHub() {
		setTitle(R.string.app_name);
		for (WebView webView : liveTools.values()) {
			webView.setVisibility(View.GONE);
		}
		hub.setVisibility(View.VISIBLE);
	}

	/** Stops every tool that has been opened, whether or not it is showing. */
	private void stopAllTools() {
		for (WebView webView : liveTools.values()) {
			webView.evaluateJavascript("stopTool()", null);
		}
	}

	// JavaScript is the entire point: the tools are a web app, and the only
	// content loaded into these WebViews is our own bundled assets.
	@SuppressLint("SetJavaScriptEnabled")
	private WebView createToolWebView() {
		WebView webView = new WebView(this);
		webView.setLayoutParams(new ViewGroup.LayoutParams(
				ViewGroup.LayoutParams.MATCH_PARENT,
				ViewGroup.LayoutParams.MATCH_PARENT));

		webView.getSettings().setJavaScriptEnabled(true);
		webView.getSettings().setDomStorageEnabled(true);
		// Tone.start() still runs from a genuine tap; this only stops the
		// WebView from second-guessing that gesture.
		webView.getSettings().setMediaPlaybackRequiresUserGesture(false);

		// Let the pages see prefers-color-scheme: dark when the system is in
		// dark mode.  The tools style both schemes themselves, so this hands
		// them the signal rather than letting the WebView darken pixels.
		if (WebViewFeature.isFeatureSupported(WebViewFeature.ALGORITHMIC_DARKENING)) {
			WebSettingsCompat.setAlgorithmicDarkeningAllowed(webView.getSettings(), true);
		}

		webView.setWebViewClient(new WebViewClient() {
			@Override
			public WebResourceResponse shouldInterceptRequest(
					WebView view, WebResourceRequest request) {
				return assetLoader.shouldInterceptRequest(request.getUrl());
			}

			@Override
			public boolean shouldOverrideUrlLoading(
					WebView view, WebResourceRequest request) {
				Uri url = request.getUrl();
				if (url.toString().startsWith(ASSET_ORIGIN)) {
					return false;
				}
				// The pages link out to Wikipedia, GitHub and similar.  Those
				// belong in a browser, not in a tool's WebView.
				startActivity(new Intent(Intent.ACTION_VIEW, url));
				return true;
			}
		});

		return webView;
	}

	@Override
	protected void onDestroy() {
		// Only on real teardown, where nothing is left to keep playing.
		for (WebView webView : liveTools.values()) {
			webView.destroy();
		}
		liveTools.clear();
		super.onDestroy();
	}

	// Deliberately absent: onPause()/onResume() overrides calling
	// webView.onPause()/onResume(), and any call to pauseTimers().
	//
	// A backgrounded WebView keeps running by default, which is what lets a
	// tool go on playing while the app is not in front.  webView.onPause()
	// would silence it, and pauseTimers() is app-global and would silence
	// every tool at once.  Adding either as "cleanup" breaks the design.
}
