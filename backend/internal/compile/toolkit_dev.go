//go:build !prod

package compile

import (
	"io/fs"
	"os"
	"path"
	"runtime"

	"robinplatform.dev/internal/log"
)

var toolkitPath string
var toolkitFS fs.FS

func init() {
	_, filename, _, _ := runtime.Caller(0)
	toolkitPath = path.Clean(path.Join(path.Dir(filename), "..", "..", "..", "toolkit"))
	toolkitFS = os.DirFS(toolkitPath)
	logger.Warn("Detected dev mode, using local toolkit", log.Ctx{
		"path": toolkitPath,
	})
}
