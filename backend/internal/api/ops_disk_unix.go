//go:build !windows

package api

func diskRootForOS() string { return "/" }
