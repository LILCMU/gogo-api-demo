
module.exports = {
    publicPath:
        process.env.NODE_ENV === 'production'
            ? '/gogo-api-demo/'
            : '/'
}
