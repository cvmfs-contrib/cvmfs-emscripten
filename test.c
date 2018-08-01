#include <fcntl.h>
#include <assert.h>
#include <stdio.h>
#include <unistd.h>
#include <emscripten.h>

int main(){
	assert(open("/cvmfs/emscripten.cvmfs.io/test/",O_RDONLY) != -1);
	open("/cvmfs/emscripten.cvmfs.io/test/regular",O_RDONLY);

	int fd=open("/cvmfs/emscripten.cvmfs.io/test/chunked-mini",O_RDONLY);
	assert(fd != -1);

	assert(open("/cvmfs/emscripten.cvmfs.io/test/not",O_RDONLY) == -1);

	char buf[256];
	int re = read(fd, buf, 256);
	printf("re = %d\n",re);
	//for(int i=0;i<256;i++)
	printf("b = %s\n",buf);
	//printf("re = %d\n",re);
	return 0;
}