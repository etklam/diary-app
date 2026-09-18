const { withMainApplication } = require('expo/config-plugins');

// RN's Android fetch uses OkHttp. Its default connection recovery can resend a
// POST below JavaScript, even when native-session refresh/replay is disabled.
// Keep the shared marker all the way to the native body and prohibit replay.
const marker = '// diary-single-attempt-writes';
const install = `${marker}
    com.facebook.react.modules.network.OkHttpClientProvider.setOkHttpClientFactory {
      com.facebook.react.modules.network.OkHttpClientProvider.createClientBuilder()
        .addInterceptor { chain ->
          val request = chain.request()
          val body = request.body
          if (request.header("x-diary-no-automatic-session-retry") == "1" && body != null) {
            val singleUseBody = object : okhttp3.RequestBody() {
              override fun contentType() = body.contentType()
              override fun contentLength() = body.contentLength()
              override fun isOneShot() = true
              override fun writeTo(sink: okio.BufferedSink) = body.writeTo(sink)
            }
            chain.proceed(request.newBuilder().method(request.method, singleUseBody).build())
          } else {
            chain.proceed(request)
          }
        }.build()
    }`;

module.exports = function withSingleAttemptWrites(config) {
  return withMainApplication(config, config => {
    if (config.modResults.language !== 'kt') throw new Error('Single-attempt writes require the audited Kotlin application template.');
    const contents = config.modResults.contents;
    if (contents.includes(marker)) return config;
    const anchor = 'super.onCreate()';
    if (!contents.includes(anchor)) throw new Error('Cannot install single-attempt transport before React Native initialization.');
    config.modResults.contents = contents.replace(anchor, `${anchor}\n    ${install}`);
    return config;
  });
};
