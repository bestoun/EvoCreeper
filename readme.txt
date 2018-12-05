Deployment:

1. Import Tester.js file inside your application.

2. In your index.html file write down following script

	<script>
            var TesterFocusClass = [/*"focused", "active", "active-button"*/];
	</script>
	<script src="Tester.js" id="test_sctipt">test</script>
	
	
	Into array, TesterFocusClass write all html classes which define active elements. 
	If you aren't defining active elements by classes leave array empty.
	Into src write the path to the Tester.js which you imported in step 1.

3. Inside config.xml file of your application import following privileges
	
	<tizen:privilege name='http://tizen.org/privilege/filesystem.read'/>
	<tizen:privilege name='http://tizen.org/privilege/filesystem.write'/>
	<tizen:privilege name='http://tizen.org/privilege/tv.inputdevice'/>

4. Run the application

	a. Running inside emulator:
		In the emulator, you have to emulate external drive for saving model files and loading test-cases files into the tester.
		For emulating external drive use this link:
		https://developer.samsung.com/tv/develop/getting-started/using-sdk/tv-emulator/emulator-control-panel/

	b. Running inside Television
		You have to connect external drive for saving model files and loading test-cases files into the tester.
		You have to run application inside debug mode then you can use web inspector.
		How to use web inspector with real device, use this link:
		https://developer.samsung.com/tv/develop/getting-started/using-sdk/web-inspector


Running of crawler:

1. Run application under test.

2.Inside web inspector, run function createModel().

3. Crawler starts crawls application a creates model. 
	This operation can take several minutes. With bigger applications, it could be hours

4. When the model is created, crawler saves the model to the external drive as csv. file.
	CSV. file can be loaded to the oxygen application for manipulating with the model.

Running of tests:

1. Run application under test.

2. Inside the application go to the active element where tests start.

3. Inside web inspector, run function runTests(filenName) which starts application testing.
	FileName is variable with path to the json file with test cases from the oxygen.

4. After testing you will see results inside web inspector.

Oxygen project:
	Open freeware tool for automated generation of test cases for application processes & workflows.
	Can be found at: http://still.felk.cvut.cz/oxygen/