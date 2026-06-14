package com.memorymap.app;

import android.os.Bundle;
import android.view.View;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Capacitor 布局加载完毕后，找到 WebView 并禁用过度滚动（防误触返回手势）
        getWindow().getDecorView().post(() -> {
            int webViewId = getResources().getIdentifier("webview", "id", getPackageName());
            if (webViewId != 0) {
                View v = findViewById(webViewId);
                if (v instanceof WebView) {
                    ((WebView) v).setOverScrollMode(View.OVER_SCROLL_NEVER);
                }
            }
        });
    }
}
